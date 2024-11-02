//
// db adapter
//

class DbAdapter 
{
    connection = null
    baseModels = { }
    boundModels = { }

    constructor (models) {
        this.baseModels = models
        for (let key in this.baseModels) {
            let model = this.baseModels[key]
            model.ensureIdColumn()
            model.ensurePropsParsed()
        }
    }

    async connect (connection) {
        this.connection = connection
        for (let key in this.baseModels) {
            // by objection.js logic, we have to bind 
            // connection instance to model class
            this.boundModels[key] = this.baseModels[key].bindKnex(connection)
            this[key] = this.boundModels[key]
        }
        return this
    }

    async disconnect () {
        for (let key in this.baseModels) {
            delete this[key]
        }
        this.boundModels = { }
        await this.connection.destroy()
        this.connection = null
    }

    async createDb ({ reset=false } = { }) {
        if (reset) {
            await this.dropDb()
        }
        let models = this.boundModels
        for (let key in models) {
            await this.createTable(models[key])
        }
        return this
    }

    async dropDb () {
        let models = this.boundModels
        for (let key of Object.keys(models).reverse()) {
            await this.dropTable(models[key])
        }
        return this
    }

    async createTable (model) {
        let schema = this.connection.schema
        if (await schema.hasTable(model.tableName)) {
            // soft ignore
            model.simulateCreateTable()
        }
        else {
            await schema.createTable(model.tableName, (table) => model.createTable(table))
        }
    }

    async dropTable (model) {
        await this.connection.schema.dropTableIfExists(model.tableName)
    }
}

function createDbAdapter (models) {
    return new DbAdapter(models)
}

export {
    DbAdapter,
    createDbAdapter
}

