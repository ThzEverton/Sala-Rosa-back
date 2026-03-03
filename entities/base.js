export default class Base {


    constructor() {

    }

    toJSON() {
        let props = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        let json = {};
        //popular objeto com as "props"
        for(let prop of props) {
            json[prop] = this[prop]
        }
        return json;
    }
}