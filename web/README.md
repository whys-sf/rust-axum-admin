# Rust Axum Admin — Web

部门树管理前端，基于 **Vue 3 + Vite + Element Plus + axios + vue-router**，对接后端 `/api/v1` 接口。

## 功能
- 登录（租户编码 + 用户名 + 密码），Bearer JWT 存于 `localStorage`，401 自动跳回登录页。
- 部门管理：树形表格展示，支持新增根/子部门、编辑、删除，上级部门用树形下拉选择。

## 开发
```bash
cd web
npm install
npm run dev      # http://localhost:5173
```
开发服务器会把 `/api`、`/swagger-ui`、`/api-docs` 代理到后端（默认 `http://localhost:8080`，可用环境变量 `VITE_BACKEND` 覆盖）。先按仓库根目录说明启动后端，再启动前端。

演示账号：`demo / admin / Admin@123456`（租户编码 `demo`）。

## 构建
```bash
npm run build    # 产物输出到 web/dist
```
