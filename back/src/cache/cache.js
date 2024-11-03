function alwaysTrue() {
    return true
}

class EntityCache {
    constructor (boundModel) {
        this.idColumn = boundModel.idColumn
        this.boundModel = boundModel
        this.dataArray = [ ]
        this.dataMap = { }
    }

    // get item by id and let it settle in cache
    async getById (id) {
        if (!this.dataMap[id]) {
            let item = await this.boundModel.query().findById(id)
            if (!item) return
            this.dataArray.push(item)
            this.dataMap[id] = item
        }
        return this.dataMap[id]
    }

    // get items by performing a query and settling all items in cache
    // example: cache.articles.getByQuery(a=> a.where("authorId", 1).offset(4*10).limit(10))
    async getByQuery (queryfunc) {
        let result = await queryfunc(this.boundModel.query())
        if (result instanceof Array) for (let item of result) {
            this.put(item, true)
        }
        else if (result) {
            this.put(result, true)
        }
        return result
    }

    // only returns cached item, does not pull anything from database.
    // does not necessary mean it is more fresh than database version.
    // but you can supply a comparer func.
    // like (item, cacheItem)=> cacheItem.updatedAt > item.updatedAt
    // if true  it returns cacheItem
    // if false it returns item 
    get (item, oldNewCompareFunc) {
        let id = this.getId(item)
        let cacheItem = this.dataMap[id]
        if (cacheItem && oldNewCompareFunc) {
            return oldNewCompareFunc(item, cacheItem)? cacheItem : item
        }
        return cacheItem ?? item
    } 

    // puts item "from any vacuum" into cache. 
    put (item, overwrite) {
        let id = this.getId(item)
        let present = !!this.dataMap[id]
        if (present && !overwrite) {
            return
        }
        this.dataMap[id] = item
        if (!present) {
            this.dataArray.push(item)
        }
        else for (let i=0; i<this.dataArray.length; i++) {
            if (this.getId(this.dataArray[i]) == id) {
                this.dataArray[i] = item
                return
            }
        }
    }

    // filter cached items.
    filter (func) {
        return this.dataArray.filter(item=> !!item).filter(func)
    }

    // filter cached items in place, and forget everything that does not match filter
    filterInPlace (func) {
        for (let i=0; i<this.dataArray.length; i++) {
            let item = this.dataArray[i]
            let isMatch = !!item && func(item)
            if (isMatch) {
                continue 
            }
            else if (item) {
                delete this.dataMap[this.getId(item)]
            }
            this.dataArray[i] = undefined
        }
        this.dataArray = this.dataArray.filter(item=> !!item)
    }

    // push one cached item by id to underlying db adapter
    async pushById (id) {
        // if entity has 1 pk column, assume id is primitive string or number
        // if entity has more than 1 pk column, assume id is object
        // otherwise it will fail
        if (this.idColumn.length > 1) {
            id = this.getId(id)
        }
        if (!this.dataMap[id]) {
            return
        }
        await this.boundModel.query().insert(this.dataMap[id]).onConflict(this.idColumn).merge()
    }

    // push all cached items to underlying db adapter, optionally filter func
    async pushAll (func) {
        func ??= alwaysTrue
        let items = this.dataArray.filter(item=> !!item && func(item))
        await this.boundModel.query().insert(items).onConflict(this.idColumn).merge()
    }

    // forget cached item by id
    forgetById (id) {
        // if entity has 1 pk column, assume id is primitive string or number
        // if entity has more than 1 pk column, assume id is object
        // otherwise it will fail
        if (this.idColumn.length > 1) {
            id = this.getId(id)
        }
        delete this.dataMap[id]
        for (let i=0; i<this.dataArray.length; i++) {
            if (this.getId(this.dataArray[i]) == id) this.dataArray[i] = undefined
        }
    }

    // forget all cached items
    forgetAll () {
        this.dataArray = [ ]
        this.dataMap = { }
    }

    getId (item) {
        return this.boundModel.getId(item)
    }
}


class Chatter2CacheAdapter {
    constructor (dbAdapter) {
        this.chatroom = new EntityCache(dbAdapter.chatroom)
        this.chatroomChunk = new EntityCache(dbAdapter.chatroomChunk)
    }
}

export { Chatter2CacheAdapter }
