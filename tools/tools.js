class Tools {

    /**
     *
     *
     * @static
     * @param {*} [v]
     * @returns {boolean}
     * @memberof Tools
     */
    static isNullUndefinedOrEmpty(v) {
        return !v || Tools.isEmpty(v);
    }

    /**
     *
     *
     * @static
     * @param {string|Array|*} v
     * @returns {boolean}
     * @memberof Tools
     */
    static isEmpty(v) {
        return ((( typeof v === "string" ) && v.length <= 0)  || (( v instanceof Array ) && v.length <= 0))
    }

}

module.exports.Tools =  Tools;