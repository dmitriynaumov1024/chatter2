import knex from "knex"

// uses process.env or options

function sqlite (options = { }) {
    return knex({
        client: "sqlite3",
        useNullAsDefault: true,
        connection: {
            filename: options.filename ?? process.env.DB_FILENAME
        },
        pool: {
            afterCreate(conn, cb) {
                conn.run("PRAGMA foreign_keys = ON", cb)
            }
        }
    })
}

function postgres (options = { }) {
    return knex({
        client: "postgres",
        connection: {
            host: options.host ?? process.env.DB_HOST,
            port: options.port ?? process.env.DB_PORT,
            database: options.database ?? process.env.DB_DATABASE,
            user: options.username ?? process.env.DB_USERNAME,
            password: options.password ?? process.env.DB_PASSWORD
        }
    })
}

export {
    sqlite,
    postgres
}
