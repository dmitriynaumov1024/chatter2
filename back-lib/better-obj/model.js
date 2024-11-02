//
// Better models
//

import { type } from "./datatype.js"

import { Model as ObjectionModel } from "objection"

class Model extends ObjectionModel
{
    // convenient constructor
    constructor (options) {
        super()
        Object.assign(this, options)
    }

    static get tableName () {
        return this.name
    }

    static field (name) {
        return this.tableName + "." + name
    }

    // tells what fields represent joined entities
    static get relationMappings () {
        this.ensurePropsParsed()
        return this._relations
    }

    // tells what fields should be serialized as json
    static get jsonAttributes () {
        this.ensurePropsParsed()
        return this._jsoncolumns
    }

    // tells what fields are primary key
    static get idColumn () {
        this.ensureIdColumn()
        return this._idcolumn
    }

    static getId (item) {
        if (!item || this._idcolumn.length <= 0) {
            return undefined
        }
        if (this.idColumn.length == 1) {
            return item[this._idcolumn[0]]
        }
        else if (this.idColumn.length == 2) {
            return item[this._idcolumn[0]] + "\n" + item[this._idcolumn[1]]
        }
        else {
            return this._idcolumn.map(key=> item[key]).join("")
        }
    }

    static ensureIdColumn () {
        if (this._idcolumn) {
            return
        }

        let props = this.props
        if (! props) {
            throw Error("Model has no props declared")
        }

        let result = []

        for (let key in props) {
            let val = props[key]
            let primaryKey = val.type 
                && val.rules instanceof Array
                && val.rules.some(rule => rule.primaryKey)
            if (primaryKey) {
                result.push(key)
            } 
        }
        this._idcolumn = result
    }

    static ensurePropsParsed () {
        if (this._relations) {
            return
        }

        this._relations ??= { }
        this._fields ??= { }
        this._jsoncolumns ??= [ ]

        let props = this.props
        if (! props) {
            throw Error("Model has no props declared")
        }

        for (let key in props) {
            let val = props[key]
            val.rules ??= []
            // skip unsupported or malformed prop
            if (! val.type) {
                continue
            }

            let vtype = null

            if (Model.isPrototypeOf(val.type)) {
                vtype = val.type
            } 
            else if ((val.type instanceof Array) && Model.isPrototypeOf(val.type[0])) {
                vtype = val.type[0]
            }
            else if ((val.type instanceof Function) && !val.rules.find(rule => rule.json)) {
                vtype = val.type()
            }

            if (vtype) {
                let rule = val.rules.filter(rule => rule.relation)[0]
                this._relations[key] = {
                    relation: rule.relation,
                    modelClass: vtype,
                    join: rule.join({ from: this, to: vtype })
                }
                continue
            }
            else {
                this._fields[key] = {
                    type: val.type,
                    rule: val.rules.reduce((a, b)=> Object.assign(a, b), { })
                }
                // get json-serialized columns
                if (this._fields[key].rule.json) {
                    this._jsoncolumns.push(key)
                }
                continue
            }
        }
    }

    static simulateCreateTable () {
        if (this === Model) {
            throw Error("Model is abstract class, can not create table")
        }
        this.ensureIdColumn()
        this.ensurePropsParsed()
    }

    static createTable (table) {
        if (this === Model) {
            throw Error("Model is abstract class, can not create table")
        }
        this.ensureIdColumn()
        this.ensurePropsParsed()

        for (let key in this._fields) {
            this.createColumn({ table, name: key, options: this._fields[key] })
        }

        table.primary(this._idcolumn)
    }

    static createColumn ({ table, name, options }) {
        let col = undefined
        if (!options.type) { 
            throw Error("column type is undefined")
        }

        // type
        if (options.type == type.Boolean) {
            col = table.boolean(name)
        }
        else if (options.type == type.String) {
            if (options.rule.max) col = table.string(name, options.rule.max)
            else col = table.text(name)
        }
        else if (options.type == type.Integer) {
            if (options.rule.increment) col = table.increments(name, options.rule)
            else col = table.integer(name)
        }
        else if (options.type == type.Float) {
            col = table.float(name)
        }
        else if (options.type == type.Double) {
            col = table.double(name)
        }
        else if (options.type == type.Timestamp) {
            col = table.timestamp(name)
        }
        else if (options.type == type.Object || options.type == Object) {
            if (options.rule.json) {
                col = table.text(name)
            }
            else {
                throw Error("field of type Object was not explicitly declared as json serializable with { rules: [ json() ] }")
            }
        }
        // extra rules
        if (options.rule.unique) {
            col = col.unique()
        }
        if (options.rule.foreignKey) {
            let target = options.rule.target
            col = col.references(target.field(target._idcolumn[0]))
            if (options.rule.onDelete) {
                col = col.onDelete(options.rule.onDelete)
            }
            else {
                col = col.onDelete("set null")
            }
        }
    }

}

/*

Class * extends Model 
{
    required:
    + static get props(): {
        "name": {
            type: type/String | class extends Model | [ class extends Model ],
            rules: [ constraint.*()/Object ]
        }
    }

    example:
    static get Person.props() {
        return {
            id: {
                type: type.Integer,
                rules: [ pk(), increment() ]
            },
            email: {
                type: type.String,
                rules: [ unique(), max(60), regex("^[a-z0-9\.\-_]\@[a-z0-9\.][a-z0-9]$") ]
            },
            name: {
                type: type.String,
                rules: [ min(2), max(30) ]
            },
            createdAt: {
                type: type.Date
                rules: [ ]
            },
            tags: {
                type: [ PersonTag ],
                rules: [ hasMany() ]
            }
        }
    }

    static get Event.props() {
        return {
            id: {
                type: type.Integer,
                rules: [ pk(), increment() ]
            },
            title: {
                type: type.String,
                rules: [ max(60) ]
            },
            ownerId: {
                type: type.Integer,
                rules: [ fk(Person) ]
            },
            owner: {
                type: Person,
                rules: [ belongsToOne() ]
            },
            tags: {
                type: [ EventTag ],
                rules: [ hasMany() ]
            }
        }
    }

    static get EventTag.props() {
        return {
            eventId: {
                type: type.Integer,
                rules: [ pk(), fk(Event) ]
            },
            tag: {
                type: type.String,
                rules: [ pk(), max(40), regex("^[a-z0-9\-_]$") ]
            }
        }
    }

    optional:
    + static get tableName(): String
    
    inherit:
    + static createTable(table: TableBuilder): void
    + static get idColumn(): [ String ]
    + static get relationMappings(): Object
}

*/

export {
    Model
}
