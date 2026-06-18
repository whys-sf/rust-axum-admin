use std::collections::HashMap;

use chrono::Utc;
use common::response::PageResult;
use common::{AppError, AppResult};
use entity::prelude::*;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};

use crate::dto::{
    CurrentUser, InboxItem, InboxQuery, MessageQuery, SendMessageReq, SentMessageItem, UnreadCount,
};
use crate::Services;

impl Services {
    /// Send a message to the given recipients (or broadcast to every active user
    /// in the tenant when `receiver_ids` is empty). Returns the created message.
    pub async fn send_message(
        &self,
        current: &CurrentUser,
        req: SendMessageReq,
    ) -> AppResult<entity::message::Model> {
        let tenant_id = current.acting_tenant();

        // resolve recipients: explicit list (validated against the tenant) or all
        // active users in the tenant.
        let receivers: Vec<i64> = if req.receiver_ids.is_empty() {
            User::find()
                .filter(entity::user::Column::TenantId.eq(tenant_id))
                .filter(entity::user::Column::Status.eq(1))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|u| u.id)
                .collect()
        } else {
            let found: Vec<i64> = User::find()
                .filter(entity::user::Column::TenantId.eq(tenant_id))
                .filter(entity::user::Column::Id.is_in(req.receiver_ids.clone()))
                .all(&self.db)
                .await?
                .into_iter()
                .map(|u| u.id)
                .collect();
            if found.len() != req.receiver_ids.len() {
                return Err(AppError::bad_request("存在无效的收件人"));
            }
            found
        };

        if receivers.is_empty() {
            return Err(AppError::bad_request("没有可用的收件人"));
        }

        let now = Utc::now();
        let message_id = self.next_id();

        let txn = self.db.begin().await?;
        let active = entity::message::ActiveModel {
            id: Set(message_id),
            tenant_id: Set(tenant_id),
            sender_id: Set(Some(current.id)),
            title: Set(req.title),
            content: Set(req.content.unwrap_or_default()),
            msg_type: Set(req.msg_type.unwrap_or(2)),
            created_at: Set(now),
        };
        let message = active.insert(&txn).await?;

        let rows: Vec<entity::message_receiver::ActiveModel> = receivers
            .into_iter()
            .map(|rid| entity::message_receiver::ActiveModel {
                id: Set(self.next_id()),
                tenant_id: Set(tenant_id),
                message_id: Set(message_id),
                receiver_id: Set(rid),
                is_read: Set(false),
                read_at: Set(None),
                created_at: Set(now),
            })
            .collect();
        MessageReceiver::insert_many(rows).exec(&txn).await?;
        txn.commit().await?;

        Ok(message)
    }

    /// Admin list of messages sent within the tenant, with recipient aggregates.
    pub async fn list_messages(
        &self,
        current: &CurrentUser,
        query: MessageQuery,
    ) -> AppResult<PageResult<SentMessageItem>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select =
            Message::find().filter(entity::message::Column::TenantId.eq(current.acting_tenant()));
        if let Some(title) = query.title.filter(|s| !s.is_empty()) {
            select = select.filter(entity::message::Column::Title.contains(&title));
        }
        let paginator = select
            .order_by_desc(entity::message::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let messages = paginator.fetch_page(page - 1).await?;

        let sender_names = self
            .resolve_usernames(messages.iter().filter_map(|m| m.sender_id))
            .await?;

        let mut list = Vec::with_capacity(messages.len());
        for m in messages {
            let recv_total = MessageReceiver::find()
                .filter(entity::message_receiver::Column::MessageId.eq(m.id))
                .count(&self.db)
                .await?;
            let recv_read = MessageReceiver::find()
                .filter(entity::message_receiver::Column::MessageId.eq(m.id))
                .filter(entity::message_receiver::Column::IsRead.eq(true))
                .count(&self.db)
                .await?;
            list.push(SentMessageItem {
                id: m.id,
                title: m.title,
                content: m.content,
                msg_type: m.msg_type,
                sender_name: m.sender_id.and_then(|s| sender_names.get(&s).cloned()),
                sender_id: m.sender_id,
                total: recv_total,
                read: recv_read,
                created_at: m.created_at,
            });
        }
        Ok(PageResult::new(list, total, page, page_size))
    }

    /// Delete a message and all its receiver rows (tenant-scoped).
    pub async fn delete_message(&self, current: &CurrentUser, id: i64) -> AppResult<()> {
        let exists = Message::find_by_id(id)
            .filter(entity::message::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .is_some();
        if !exists {
            return Err(AppError::not_found("消息不存在"));
        }
        let txn = self.db.begin().await?;
        MessageReceiver::delete_many()
            .filter(entity::message_receiver::Column::MessageId.eq(id))
            .exec(&txn)
            .await?;
        Message::delete_by_id(id).exec(&txn).await?;
        txn.commit().await?;
        Ok(())
    }

    /// The current user's inbox (received messages + read state).
    pub async fn list_inbox(
        &self,
        current: &CurrentUser,
        query: InboxQuery,
    ) -> AppResult<PageResult<InboxItem>> {
        let (page, page_size) = query.pagination().normalized();
        let mut select = MessageReceiver::find()
            .filter(entity::message_receiver::Column::ReceiverId.eq(current.id))
            .filter(entity::message_receiver::Column::TenantId.eq(current.acting_tenant()));
        if query.unread_only.unwrap_or(false) {
            select = select.filter(entity::message_receiver::Column::IsRead.eq(false));
        }
        let paginator = select
            .order_by_desc(entity::message_receiver::Column::CreatedAt)
            .paginate(&self.db, page_size);
        let total = paginator.num_items().await?;
        let receivers = paginator.fetch_page(page - 1).await?;

        let message_ids: Vec<i64> = receivers.iter().map(|r| r.message_id).collect();
        let messages = Message::find()
            .filter(entity::message::Column::Id.is_in(message_ids))
            .all(&self.db)
            .await?;
        let message_map: HashMap<i64, entity::message::Model> =
            messages.iter().map(|m| (m.id, m.clone())).collect();
        let sender_names = self
            .resolve_usernames(messages.iter().filter_map(|m| m.sender_id))
            .await?;

        let list = receivers
            .into_iter()
            .filter_map(|r| {
                message_map.get(&r.message_id).map(|m| InboxItem {
                    message_id: m.id,
                    title: m.title.clone(),
                    content: m.content.clone(),
                    msg_type: m.msg_type,
                    sender_id: m.sender_id,
                    sender_name: m.sender_id.and_then(|s| sender_names.get(&s).cloned()),
                    is_read: r.is_read,
                    read_at: r.read_at,
                    created_at: r.created_at,
                })
            })
            .collect();
        Ok(PageResult::new(list, total, page, page_size))
    }

    /// Number of unread messages in the current user's inbox.
    pub async fn unread_count(&self, current: &CurrentUser) -> AppResult<UnreadCount> {
        let count = MessageReceiver::find()
            .filter(entity::message_receiver::Column::ReceiverId.eq(current.id))
            .filter(entity::message_receiver::Column::TenantId.eq(current.acting_tenant()))
            .filter(entity::message_receiver::Column::IsRead.eq(false))
            .count(&self.db)
            .await?;
        Ok(UnreadCount { count })
    }

    /// View a single inbox message, marking it read as a side effect.
    pub async fn view_inbox_message(
        &self,
        current: &CurrentUser,
        message_id: i64,
    ) -> AppResult<InboxItem> {
        let receiver = self.find_receiver(current, message_id).await?;
        if !receiver.is_read {
            let mut active: entity::message_receiver::ActiveModel = receiver.clone().into();
            active.is_read = Set(true);
            active.read_at = Set(Some(Utc::now()));
            active.update(&self.db).await?;
        }
        let message = Message::find_by_id(message_id)
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("消息不存在"))?;
        let sender_names = self
            .resolve_usernames(message.sender_id.into_iter())
            .await?;
        Ok(InboxItem {
            message_id: message.id,
            title: message.title,
            content: message.content,
            msg_type: message.msg_type,
            sender_id: message.sender_id,
            sender_name: message
                .sender_id
                .and_then(|s| sender_names.get(&s).cloned()),
            is_read: true,
            read_at: Some(receiver.read_at.unwrap_or_else(Utc::now)),
            created_at: message.created_at,
        })
    }

    /// Mark a single inbox message as read.
    pub async fn mark_message_read(&self, current: &CurrentUser, message_id: i64) -> AppResult<()> {
        let receiver = self.find_receiver(current, message_id).await?;
        if !receiver.is_read {
            let mut active: entity::message_receiver::ActiveModel = receiver.into();
            active.is_read = Set(true);
            active.read_at = Set(Some(Utc::now()));
            active.update(&self.db).await?;
        }
        Ok(())
    }

    /// Mark every message in the current user's inbox as read.
    pub async fn mark_all_read(&self, current: &CurrentUser) -> AppResult<()> {
        use sea_orm::sea_query::Expr;
        MessageReceiver::update_many()
            .col_expr(entity::message_receiver::Column::IsRead, Expr::value(true))
            .col_expr(
                entity::message_receiver::Column::ReadAt,
                Expr::value(Utc::now()),
            )
            .filter(entity::message_receiver::Column::ReceiverId.eq(current.id))
            .filter(entity::message_receiver::Column::TenantId.eq(current.acting_tenant()))
            .filter(entity::message_receiver::Column::IsRead.eq(false))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    /// Delete a message from the current user's inbox (only the receiver row).
    pub async fn delete_inbox_message(
        &self,
        current: &CurrentUser,
        message_id: i64,
    ) -> AppResult<()> {
        let receiver = self.find_receiver(current, message_id).await?;
        MessageReceiver::delete_by_id(receiver.id)
            .exec(&self.db)
            .await?;
        Ok(())
    }

    async fn find_receiver(
        &self,
        current: &CurrentUser,
        message_id: i64,
    ) -> AppResult<entity::message_receiver::Model> {
        MessageReceiver::find()
            .filter(entity::message_receiver::Column::MessageId.eq(message_id))
            .filter(entity::message_receiver::Column::ReceiverId.eq(current.id))
            .filter(entity::message_receiver::Column::TenantId.eq(current.acting_tenant()))
            .one(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("消息不存在"))
    }

    async fn resolve_usernames(
        &self,
        ids: impl Iterator<Item = i64>,
    ) -> AppResult<HashMap<i64, String>> {
        let ids: Vec<i64> = ids.collect();
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let users = User::find()
            .filter(entity::user::Column::Id.is_in(ids))
            .all(&self.db)
            .await?;
        Ok(users
            .into_iter()
            .map(|u| (u.id, u.nickname.unwrap_or(u.username)))
            .collect())
    }
}
