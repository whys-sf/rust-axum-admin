use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

pub const TOKEN_TYPE_ACCESS: &str = "access";
pub const TOKEN_TYPE_REFRESH: &str = "refresh";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// user id (stringified)
    pub sub: String,
    pub username: String,
    pub tenant_id: i64,
    pub is_platform: bool,
    /// unique token id, used for the blacklist
    pub jti: String,
    /// "access" | "refresh"
    pub typ: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Clone)]
pub struct JwtService {
    secret: String,
    access_ttl: i64,
    refresh_ttl: i64,
}

pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub access_jti: String,
    pub refresh_jti: String,
    pub expires_in: i64,
}

impl JwtService {
    pub fn new(secret: impl Into<String>, access_ttl: i64, refresh_ttl: i64) -> Self {
        Self {
            secret: secret.into(),
            access_ttl,
            refresh_ttl,
        }
    }

    fn sign(&self, claims: &Claims) -> anyhow::Result<String> {
        let token = encode(
            &Header::default(),
            claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )?;
        Ok(token)
    }

    fn build_claims(
        &self,
        user_id: i64,
        username: &str,
        tenant_id: i64,
        is_platform: bool,
        typ: &str,
        ttl: i64,
    ) -> (Claims, String) {
        let now = Utc::now().timestamp();
        let jti = uuid_like();
        let claims = Claims {
            sub: user_id.to_string(),
            username: username.to_string(),
            tenant_id,
            is_platform,
            jti: jti.clone(),
            typ: typ.to_string(),
            iat: now as usize,
            exp: (now + ttl) as usize,
        };
        (claims, jti)
    }

    pub fn issue_pair(
        &self,
        user_id: i64,
        username: &str,
        tenant_id: i64,
        is_platform: bool,
    ) -> anyhow::Result<TokenPair> {
        let (access_claims, access_jti) = self.build_claims(
            user_id,
            username,
            tenant_id,
            is_platform,
            TOKEN_TYPE_ACCESS,
            self.access_ttl,
        );
        let (refresh_claims, refresh_jti) = self.build_claims(
            user_id,
            username,
            tenant_id,
            is_platform,
            TOKEN_TYPE_REFRESH,
            self.refresh_ttl,
        );

        Ok(TokenPair {
            access_token: self.sign(&access_claims)?,
            refresh_token: self.sign(&refresh_claims)?,
            access_jti,
            refresh_jti,
            expires_in: self.access_ttl,
        })
    }

    pub fn verify(&self, token: &str) -> anyhow::Result<Claims> {
        let data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default(),
        )?;
        Ok(data.claims)
    }

    pub fn access_ttl(&self) -> i64 {
        self.access_ttl
    }

    pub fn refresh_ttl(&self) -> i64 {
        self.refresh_ttl
    }
}

/// Generate a reasonably-unique token id without pulling in the uuid crate.
fn uuid_like() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let rand = {
        // cheap entropy from address of a stack value
        let x = 0u8;
        (&x as *const u8 as usize) as u128
    };
    format!("{nanos:x}{rand:x}")
}
