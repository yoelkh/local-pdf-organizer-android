//! Parser rentang halaman gaya pengguna: "1-3,5,8-" (1-based).
//! Hasil berupa indeks 0-based, urut sesuai penulisan, tanpa duplikat.

use crate::core::error::{AppError, AppResult};

pub fn parse(spec: &str, page_count: u32) -> AppResult<Vec<u32>> {
    let trimmed = spec.trim();
    if trimmed.is_empty() {
        return Ok((0..page_count).collect());
    }

    let mut out: Vec<u32> = Vec::new();
    for part in trimmed.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        let (start, end) = match part.split_once('-') {
            Some((a, b)) => (parse_num(a, 1)?, parse_num(b, page_count)?),
            None => {
                let n = parse_num(part, 0)?;
                (n, n)
            }
        };
        if start < 1 || end < start || end > page_count {
            return Err(AppError::InvalidInput(format!(
                "page range '{part}' is outside 1-{page_count}"
            )));
        }
        for p in start..=end {
            let idx = p - 1;
            if !out.contains(&idx) {
                out.push(idx);
            }
        }
    }

    if out.is_empty() {
        return Err(AppError::InvalidInput("page range is empty".into()));
    }
    Ok(out)
}

fn parse_num(s: &str, default_if_empty: u32) -> AppResult<u32> {
    let s = s.trim();
    if s.is_empty() {
        return Ok(default_if_empty);
    }
    s.parse::<u32>()
        .map_err(|_| AppError::InvalidInput(format!("'{s}' is not a page number")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_means_all_pages() {
        assert_eq!(parse("", 3).unwrap(), vec![0, 1, 2]);
        assert_eq!(parse("   ", 2).unwrap(), vec![0, 1]);
    }

    #[test]
    fn parses_ranges_and_singles_in_order() {
        assert_eq!(parse("1-3,5", 6).unwrap(), vec![0, 1, 2, 4]);
        assert_eq!(parse("5, 1-2", 6).unwrap(), vec![4, 0, 1]);
        assert_eq!(parse("4-", 6).unwrap(), vec![3, 4, 5]);
        assert_eq!(parse("-2", 6).unwrap(), vec![0, 1]);
        assert_eq!(parse("2,2,2", 6).unwrap(), vec![1]);
    }

    #[test]
    fn rejects_out_of_range_and_garbage() {
        assert!(parse("0", 3).is_err());
        assert!(parse("4", 3).is_err());
        assert!(parse("3-1", 3).is_err());
        assert!(parse("abc", 3).is_err());
    }
}
