use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Custom epoch (2024-01-01T00:00:00Z) in milliseconds.
const EPOCH: i64 = 1_704_067_200_000;

const WORKER_ID_BITS: i64 = 5;
const DATACENTER_ID_BITS: i64 = 5;
const SEQUENCE_BITS: i64 = 12;

const MAX_WORKER_ID: i64 = -1 ^ (-1 << WORKER_ID_BITS);
const MAX_DATACENTER_ID: i64 = -1 ^ (-1 << DATACENTER_ID_BITS);
const SEQUENCE_MASK: i64 = -1 ^ (-1 << SEQUENCE_BITS);

const WORKER_ID_SHIFT: i64 = SEQUENCE_BITS;
const DATACENTER_ID_SHIFT: i64 = SEQUENCE_BITS + WORKER_ID_BITS;
const TIMESTAMP_SHIFT: i64 = SEQUENCE_BITS + WORKER_ID_BITS + DATACENTER_ID_BITS;

/// A thread-safe Twitter-style snowflake id generator producing `i64` ids.
pub struct Snowflake {
    worker_id: i64,
    datacenter_id: i64,
    inner: Mutex<Inner>,
}

struct Inner {
    sequence: i64,
    last_timestamp: i64,
}

impl Snowflake {
    pub fn new(worker_id: i64, datacenter_id: i64) -> Self {
        assert!(
            (0..=MAX_WORKER_ID).contains(&worker_id),
            "worker_id out of range 0..={MAX_WORKER_ID}"
        );
        assert!(
            (0..=MAX_DATACENTER_ID).contains(&datacenter_id),
            "datacenter_id out of range 0..={MAX_DATACENTER_ID}"
        );
        Self {
            worker_id,
            datacenter_id,
            inner: Mutex::new(Inner {
                sequence: 0,
                last_timestamp: -1,
            }),
        }
    }

    pub fn next_id(&self) -> i64 {
        let mut inner = self.inner.lock().expect("snowflake mutex poisoned");
        let mut timestamp = now_millis();

        if timestamp < inner.last_timestamp {
            // clock moved backwards; wait until it catches up
            timestamp = inner.last_timestamp;
        }

        if timestamp == inner.last_timestamp {
            inner.sequence = (inner.sequence + 1) & SEQUENCE_MASK;
            if inner.sequence == 0 {
                // sequence exhausted for this millisecond; spin to next ms
                while timestamp <= inner.last_timestamp {
                    timestamp = now_millis();
                }
            }
        } else {
            inner.sequence = 0;
        }

        inner.last_timestamp = timestamp;

        ((timestamp - EPOCH) << TIMESTAMP_SHIFT)
            | (self.datacenter_id << DATACENTER_ID_SHIFT)
            | (self.worker_id << WORKER_ID_SHIFT)
            | inner.sequence
    }
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_millis() as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_unique_and_increasing() {
        let sf = Snowflake::new(1, 1);
        let mut prev = 0;
        for _ in 0..10_000 {
            let id = sf.next_id();
            assert!(id > prev, "ids should be monotonically increasing");
            prev = id;
        }
    }
}
