# Line Endings Policy

This repository enforces **LF (`\n`) line endings** for all text files.

## Why?

- Prevents CRLF/LF churn across different operating systems
- Ensures consistent diffs and blame history
- Matches Prettier configuration (`"endOfLine": "lf"` in `.prettierrc.json`)

## Git Configuration

We use a root-level [`.gitattributes`](../.gitattributes) file with:

```
* text=auto eol=lf
```

This ensures Git normalizes line endings to LF on checkout and commit.

## Contributor Notes

- Do **not** rely on `core.autocrlf` to manage line endings.  
  Instead, let `.gitattributes` handle normalization.
- If you previously committed files with CRLF endings, run:

```bash
git rm --cached -r .
git reset --hard
```

This will re-checkout files with the correct LF endings.
