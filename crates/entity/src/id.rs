//! Serde helpers that render snowflake `i64` ids as JSON **strings**.
//!
//! Snowflake ids routinely exceed JavaScript's `Number.MAX_SAFE_INTEGER`
//! (2^53 − 1), where `JSON.parse` silently rounds them. Emitting ids as strings
//! keeps them exact on every client. Deserialization is lenient: it accepts both
//! the string form (what our frontend sends) and a bare JSON number (handy for
//! tests and other callers).
//!
//! Use via `#[serde(with = ...)]`, pairing with utoipa's
//! `#[schema(value_type = String)]` so the OpenAPI doc matches the wire format:
//!
//! ```ignore
//! #[serde(with = "entity::id::string")]
//! #[schema(value_type = String)]
//! pub id: i64,
//! ```

use serde::Deserialize;

/// Accepts either a JSON string or a JSON number when decoding an id.
#[derive(Deserialize)]
#[serde(untagged)]
enum StrOrInt {
    Str(String),
    Int(i64),
}

impl StrOrInt {
    fn into_i64<E: serde::de::Error>(self) -> Result<i64, E> {
        match self {
            StrOrInt::Str(s) => s.parse().map_err(serde::de::Error::custom),
            StrOrInt::Int(i) => Ok(i),
        }
    }
}

/// `i64` <-> JSON string.
pub mod string {
    use super::StrOrInt;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(v: &i64, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&v.to_string())
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<i64, D::Error> {
        StrOrInt::deserialize(d)?.into_i64()
    }
}

/// `Option<i64>` <-> JSON string / null.
pub mod string_opt {
    use super::StrOrInt;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(v: &Option<i64>, s: S) -> Result<S::Ok, S::Error> {
        match v {
            Some(i) => s.serialize_some(&i.to_string()),
            None => s.serialize_none(),
        }
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Option<i64>, D::Error> {
        match Option::<StrOrInt>::deserialize(d)? {
            Some(v) => v.into_i64().map(Some),
            None => Ok(None),
        }
    }
}

/// `Vec<i64>` <-> JSON array of strings.
pub mod string_vec {
    use super::StrOrInt;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(v: &[i64], s: S) -> Result<S::Ok, S::Error> {
        let strs: Vec<String> = v.iter().map(|i| i.to_string()).collect();
        serde::Serialize::serialize(&strs, s)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Vec<i64>, D::Error> {
        Vec::<StrOrInt>::deserialize(d)?
            .into_iter()
            .map(StrOrInt::into_i64)
            .collect()
    }
}
