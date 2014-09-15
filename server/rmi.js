/**
 * Created by xiong on 14-8-20.
 */
var log = console.log.bind(console)
var serverObjs = {}
var exportStub = {}

var baseUrl;
var getUUID = function () {
    var index = 0;
    var f = function () {
        index = index + 1;
        return index;
    };
    return f;
}();

/**
 *
 * @param exportName
 * @param obj
 * @private
 */


var _export = function (exportName, obj) {
    //获取obj所有方法签名
    if (!(obj instanceof Object))return;
    var methods = []
    var signature = {}
    for (var propName in obj) {
        var prop = obj[propName];
        if (prop instanceof Function && obj.hasOwnProperty(propName)) {
            methods.push(propName);
            signature[propName] = splitFunc(prop);
        }
    }
    obj.__exportName__ = exportName
    serverObjs[exportName] = obj
    exportStub[exportName] = {signature: signature, func: methods}
}


/**
 *
 * @param func
 * @returns {{name: (*|string), args: Array, body: (*|string)}}
 */
var isAsyncFunc = function(){

}

var splitFunc = function (func) {

    if (!( func instanceof (Function)))return;
    var reFn = /^function\s*([^\s(]*)\s*\(([^)]*)\)[^{]*\{([^]*)\}$/gi
        , s = func.toString().replace(/\/\*.*?\*\//g, '').replace(/\/\/.*?$/gm, '').replace(/^\s|\s$/g, '')
        , m = reFn.exec(s);
    // log(m);
    if (!m || !m.length) return;
    var funcParts = {
        name: m[1] || '',
        args: m[2].replace(/\s+/g, '').split(','),
        // body: m[3] || ''
    }
    return funcParts
}

var _handler = function (req, res) {
    //res.send('respond with a resource');
    req.accepts('json');
    var data;
    if (req.method == 'POST') {
        data = req.param('rmi');
    }
    else {
        data = req.query.rmi
    }

    console.log(data)
    var rmiSignature = JSON.parse(data)
    var serverRmiObj = serverObjs[rmiSignature.obj]
    var func = serverRmiObj[rmiSignature.func]
    var val = func.apply(serverRmiObj, rmiSignature.params)
    res.json(val)
}

var connection = function (req, res) {
}

var route = function (app, path) {
    app.post(path, _handler);
    app.get(path + '/js', function (req, res) {
        res.setHeader("content-type", 'text/javascript');
        res.send(generateJs())
    })
}
var rootPath = function (relativePath, app) {
    baseUrl = relativePath;
    route(app, baseUrl)
}

var generateJs = function () {
    var svrObjJson = 'var rmiObjDesc=' + JSON.stringify(exportStub);

    var jsBodyLine = []
    jsBodyLine.push('(function(){')
    jsBodyLine.push(svrObjJson)
    jsBodyLine.push('var baseUrl =\"' + baseUrl + '\"')
    jsBodyLine.push('$rmi=(' + clientPart.toString() + ')()')
    jsBodyLine.push('})()')
    return jsBodyLine.join('\n')

}

module.exports = {export: _export, rootPath: rootPath }

//--------------------------------------

var clientPart = function () {


    var callRemoteFunc = function (exportName, funcname, params) {

        var rmiCaller = undefined
        var handler = {

            value: function (valReceiverFunc) {
                if (!rmiCaller) ajax(exportName, funcname, params);
                rmiCaller.done(valReceiverFunc)
                return this;
            },
            error: function (errFunc) {
                if (!rmiCaller) ajax(exportName, funcname, params);
                rmiCaller.error(errFunc)
                return this;
            }
        };

        var callbackFunc = function (val, err) {

        };

        var ajax = function (exportName, funcName, params) {
            rmiCaller = $.post(baseUrl, {rmi: JSON.stringify({obj: exportName, func: funcName, params: params})})
        }


        return handler;

    }

    var dir = function () {

    }

    var lookup = function (exportName, rmiObj) {
        rmiObj = rmiObj || rmiObjDesc;
        var find = rmiObj[exportName];
        var stub = {}
        if (find) {
            for (var func in find.signature) {
                stub[func] = function (exportName, func) {
                    return  function () {
                        var args = Array.prototype.slice.call(arguments, 0);
                        return  callRemoteFunc(exportName, func, args)
                    }
                }(exportName, func)
            }
        }
        return stub;

    }
    var bind = function (url) {
        baseUrl = url || baseUrl;
    }
    return {lookup: lookup}
}