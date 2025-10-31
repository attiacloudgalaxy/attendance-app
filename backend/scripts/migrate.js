const mysql = require('mysql2/promise');
require('dotenv').config();

const runMigration = async () => {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'attendance123',
        port: 3306,
        multipleStatements: true
    });

    try {
        console.log('Running database migration...');
        
        // Read and execute schema
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await connection.query(schema);
        
        console.log('Database migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
};

runMigration();