use std::num::NonZeroU16;

pub fn parse_port(value: &str) -> Result<NonZeroU16, &'static str> {
    value
        .parse::<NonZeroU16>()
        .map_err(|_| "port must be an integer between 1 and 65535")
}

#[cfg(test)]
mod tests {
    use super::parse_port;

    #[test]
    fn accepts_a_valid_port() {
        assert_eq!(parse_port("8080").unwrap().get(), 8080);
    }

    #[test]
    fn rejects_invalid_ports() {
        for value in ["0", "65536", "abc", "-1"] {
            assert!(parse_port(value).is_err(), "{value} should be rejected");
        }
    }
}
