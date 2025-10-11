# Database Backup and Restore Scripts

This directory contains scripts for backing up and restoring your PostgreSQL database.

## Available Scripts

- **create-backup.js**: Creates a plain SQL text backup (.sql extension)
- **backup-database.js**: Creates a custom format backup (.dump extension)
- **restore-database.js**: Restores from either backup format

## Backup Formats

1. **Plain SQL (.sql)** - Created by `create-backup.js`
   - Human-readable SQL statements
   - Larger file size
   - Can be viewed/edited in a text editor
   - Restored using `psql`

2. **Custom Format (.dump)** - Created by `backup-database.js`
   - PostgreSQL custom binary format
   - Smaller file size (compressed)
   - Not human-readable
   - Restored using `pg_restore`
   - Supports parallel restore

## Usage

### Creating a Backup

For plain SQL backup:
```bash
node create-backup.js
```

For custom format backup:
```bash
node backup-database.js
```

### Restoring a Backup

To restore any backup format:
```bash
node restore-database.js
```

The script will:
1. List all available backups
2. Let you select which backup to restore
3. Confirm before proceeding
4. Choose the appropriate restore method based on file extension

## Configuration

Both scripts use these environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `BACKUP_DIR`: Directory where backups are stored (defaults to `../backups`)

You can set these in your `.env` file or pass them when running the scripts:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb BACKUP_DIR=./my_backups node create-backup.js
``` 