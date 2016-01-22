(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
tui.util.defineNamespace('tui.component.Uploader', require('./src/js/uploader.js'));


},{"./src/js/uploader.js":7}],2:[function(require,module,exports){
/**
 * @fileoverview This Connector make connection between FileManager and file server api at modern browser.<br>
 *     This Connector use ajax.
 * @dependency ne-code-snippet 1.0.3, jquery1.8.3
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
/**
 * The modules will be mixed in connector by type.
 * @namespace Connector.Ajax
 */
var Ajax = {/** @lends Connector.Ajax */
    type: 'POST',

    /**
     * Request ajax by config to add files.
     * @param {object} config The configuration for ajax request
     *  @param {string} config.url Request url(upload url or remove url)
     *  @param {function} config.success Callback function when request suceess.
     *  @param {function} config.error Callback function when request faild.
     * @param {Array} files Files
     *  @memberof Connector.Ajax
     */
    addRequest: function(config, files) {
        var uploader = this._uploader,
            $form = uploader.inputView.$el,
            callback = tui.util.bind(this.successPadding, this, config.success);

        if (files) {
            this.formData = new FormData();
            tui.util.forEach(files, function(file) {
                this.formData.append(uploader.fileField, file);
            }, this);
        } else {
            this.formData = new FormData($form[0]);
        }
        $.ajax({
            url: this._uploader.url.send,
            type: this.type,
            data: this.formData,
            success: callback,
            processData: false,
            contentType: false,
            error: config.error
        });
    },

    /**
     * Preprocessing callback before callback run.
     * @param {function} callback Request Callback function
     * @param {object} response Response from server
     * @memberof Connector.Ajax
     */
    successPadding: function(callback, response) {
        var json = JSON.parse(response),
            result = {};

        result.items = json.filelist;
        callback(result);
    },

    /**
     * Request ajax by config to remove file.
     * @param {object} config Configuration for remove
     * @memberof Connector.Ajax
     */
    removeRequest: function(config) {
        var callback = tui.util.bind(this.removePadding, this, config.success);
        $.ajax({
            url: this._uploader.url.remove,
            data: config.data,
            success: callback,
            error: config.error
        });
    },

    /**
     * Preprocessing response before callback run.
     * @param {function} callback Request Callback function
     * @param {object} response Response from server
     * @memberof Connector.Ajax
     */
    removePadding: function(callback, response) {
        var json = JSON.parse(response),
            result = {};

        result.action = 'remove';
        result.name = decodeURIComponent(json.name);

        callback(result);
    }
};

module.exports = Ajax;

},{}],3:[function(require,module,exports){
/**
 * @fileoverview A Connector make connection between FileManager and file server API.<br> The Connector is interface.
 * @dependency ne-code-snippet 1.0.3, jquery1.8.3
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var Ajax = require('./ajax');
var Jsonp = require('./jsonp');
var Local = require('./local');

var ModuleSets = {
    'ajax': Ajax,
    'jsonp': Jsonp,
    'local': Local
};

/**
 * This is Interface to be implemented by connectors
 * @namespace Connector
 */
var Connector = {
    /**
     * A interface removeRequest to implement
     * @param {object} options A information for delete file
     * @memberof Connector
     */
    removeRequest: function(options) {
        throw new Error('The interface removeRequest does not exist');
    },

    /**
     * A interface addRequest to implement
     * @param {object} options A information for add file
     * @memberof Connector
     */
    addRequest: function(options) {
        throw new Error('The interface addRequest does not exist');
    }
};

/**
 * The factory module for connectors.
 * Get each connector by each type.
 * @namespace Factory
 */
var Factory = {
    /**
     * Choose connector
     * @param uploader
     * @returns {{_uploader: *}}
     * @memberof Factory
     */
    getConnector: function(uploader) {
        var type = uploader.type.toLowerCase(),
            conn = {
                _uploader: uploader
            };
        tui.util.extend(conn, Connector, ModuleSets[type] || Local);
        return conn;
    }
};

module.exports = Factory;

},{"./ajax":2,"./jsonp":4,"./local":5}],4:[function(require,module,exports){
/**
 * @fileoverview This Connector make connection between FileManager and file server api at old browser.<br>
 *     This Connector use hidden iframe.
 * @dependency ne-code-snippet 1.0.3, jquery1.8.3
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
/**
 * The modules will be mixed in connector by type.
 * @namespace Connector.Jsonp
 */
var Jsonp = {/** @lends Connector.Jsonp.prototype */
    /**
     * Request by form submit.
     * @param {object} config Configuration for submit form.
     *  @param {function} config.success Callback when post submit complate.
     * @memberof Connector.Jsonp
     */
    addRequest: function(config) {
        var callbackName = this._uploader.callbackName,
            callback = config.success;

        tui.util.defineNamespace(callbackName,  tui.util.bind(this.successPadding, this, callback));
        this._uploader.inputView.$el.submit();
    },

    /**
     * Preprocessing response before callback run.
     * @param {function} callback Request Callback function
     * @param {object} response Response from server
     * @memberof Connector.Jsonp
     */
    successPadding: function(callback, response) {
        var result = {};

        if (this._uploader.isCrossDomain()) {
            result.items = this._getSplitItems(response);
        } else {
            result.items = tui.util.toArray(response.filelist);
        }

        callback(result);
    },

    /**
     * Make query data to array
     * @param {object} data The Data extracted from querystring separated by '&'
     * @private
     * @memberof Connector.Jsonp
     */
    _getSplitItems: function(data) {
        var sep = this._uploader.separator,
            status = data.status.split(sep),
            names = data.names.split(sep),
            sizes = data.sizes.split(sep),
            ids = tui.util.isString(data.ids) ? data.ids.split(sep) : names,
            items = [];

        tui.util.forEach(status, function(item, index) {
            if (item === 'success') {
                var nItem = {
                    name: names[index],
                    status: status[index],
                    size: sizes[index],
                    id: ids[index]
                };
                items.push(nItem);
            }
        });
        return items;
    },

    /**
     * Request ajax by config to remove file.
     * @param {object} config
     * @memberof Connector.Jsonp
     */
    removeRequest: function(config) {
        var callbackName = this._uploader.callbackName,
            data = {
                callback: callbackName
            },
            callback = config.success;

        tui.util.defineNamespace(callbackName, tui.util.bind(this.removePadding, this, callback), true);

        $.ajax({
            url: this._uploader.url.remove,
            dataType: 'jsonp',
            jsonp: callbackName,
            data: tui.util.extend(data, config.data)
        });

    },

    /**
     * Preprocessing response before callback run.
     * @param {function} callback Request Callback function
     * @param {object} response Response from server
     * @memberof Connector.Jsonp
     */
    removePadding: function(callback, response) {
        var result = {};
        result.action = 'remove';
        result.name = decodeURIComponent(response.name);

        callback(result);
    }
};

module.exports = Jsonp;

},{}],5:[function(require,module,exports){
/**
 * @fileoveview This Connector make connection between Uploader and html5 file api.
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var utils = require('../utils');

/**
 * The modules will be mixed in connector by type.
 * @namespace Connector.Local
 */
var Local = {/** @lends Connector.Local.prototype */
    _isSupportingFormData: utils.isSupportFormData(),
    /**
     * A result array to save file to send.
     */
    _result : null,
    /**
     * Add Request, save files to array.
     * @param {object} data The data of connection for server
     * @param {object} [files] The files to save
     * @memberof Connector.Local
     */
    addRequest: function(data, files) {
        var isValidPool = utils.isSupportFormData(),
            result = this._saveFile(isValidPool, files);

        data.success({
            items: result
        });
    },

    /**
     * Save file to pool
     * @param {boolean} isSupportAjax Whether FormData is supported or not
     * @param {object} [files] The files to save
     * @private
     * @memberof Connector.Local
     */
    _saveFile: function(isSupportAjax, files) {
        var uploader = this._uploader,
            inputView = uploader.inputView,
            fileEl = inputView.$input[0],
            result = [];

        if (!this._result) {
            this._result = [];
        }

        if (isSupportAjax) {
            files = tui.util.toArray(files || fileEl.files);
            tui.util.forEach(files, function(item) {
                if (tui.util.isObject(item)) {
                    result.push(item);
                }
            }, this);
        } else {
            result.push({
                name: fileEl.value,
                element: fileEl
            });
        }

        this._result = this._result.concat(result);
        return result;
    },

    /**
     * Makes form data to send POST(FormDate supported case)
     * @returns {*}
     * @private
     * @memberof Connector.Local
     */
    _makeFormData: function() {
        var uploader = this._uploader,
            field = uploader.fileField,
            input = uploader.inputView,
            form = new window.FormData(this._extractForm(input));

        tui.util.forEach(this._result, function(item) {
            form.append(field, item);
        });
        return form;
    },

    /**
     * Extracts Form from inputView
     * @param {object} input The input view for extracting
     * @memberof Connector.Local
     * @private
     */
    _extractForm: function(input) {
        var form = input.$el.clone();
        form.find('input[type="file"]').remove();
        return form[0];
    },

    /**
     * Remove file form result array
     * @param {object} info The information set to remove file
     * @memberof Connector.Local
     */
    removeRequest: function(info) {
        var data = info.data,
            filename = data.filename,
            result = this._result;

        tui.util.forEach(result, function(el, index) {
            if (el.name === filename) {
                result.splice(index, 1);
                return false;
            }
        });

        info.success({
            action: 'remove',
            name: data.filename
        });
    },

    /**
     * Send files in a batch.
     * @param callback
     * @memberof Connector.Local
     */
    submit: function(callback) {
        var form = this._makeFormData(this._uploader.inputView);

        $.ajax({
            url: this._uploader.url.send,
            type: 'POST',
            data: form,
            success: callback,
            processData: false,
            contentType: false
        });
    }
};

module.exports = Local;

},{"../utils":8}],6:[function(require,module,exports){
/**
 * @fileoverview Configuration or default values.
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
/**
 * Configuration of connection with server.
 * @type {{RESPONSE_TYPE: string, REDIRECT_URL: string}}
 */
module.exports.CONF = {
    RESPONSE_TYPE: 'RESPONSE_TYPE',
    REDIRECT_URL: 'REDIRECT_URL',
    JSONPCALLBACK_NAME: 'CALLBACK_NAME',
    SIZE_UNIT: 'SIZE_UNIT',
    REMOVE_CALLBACK : 'responseRemoveCallback',
    ERROR: {
        DEFAULT: 'Unknown error.',
        NOT_SURPPORT: 'This is x-domain connection, you have to make helper page.'
    },
    DRAG_DEFAULT_ENABLE_CLASS: 'enableClass',
    FILE_FILED_NAME: 'userfile[]',
    FOLDER_INFO: 'folderName'
};

/**
 * Default Htmls
 * @type {{input: string, item: string}}
 */
module.exports.HTML = {
    form: ['<form enctype="multipart/form-data" id="formData" method="post">',
        '<input type="hidden" name="MAX_FILE_SIZE" value="3000000" />',
        '</form>'].join(''),
    input: ['<input type="file" id="fileAttach" {{webkitdirectory}} name="{{fileField}}" {{multiple}} />'].join(''),
    submit: ['<button class="batchSubmit" type="submit">SEND</button>'].join(''),
    item: ['<li class="filetypeDisplayClass">',
        '<spna class="fileicon {{filetype}}">{{filetype}}</spna>',
        '<span class="file_name">{{filename}}</span>',
        '<span class="file_size">{{filesize}}</span>',
        '<button type="button" class="{{deleteButtonClassName}}">Delete</button>',
        '</li>'].join(''),
    drag: ['<div class="dragzone"></div>'].join('')
};

},{}],7:[function(require,module,exports){
/**
 * @fileoverview FileUploader is core of file uploader component.<br>FileManager manage connector to connect server and update FileListView.
 * @dependency ne-code-snippet 1.0.3, jquery1.8.3
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var consts = require('./consts');
var utils = require('./utils');
var conn = require('./connector/connector');
var Input = require('./view/input');
var List = require('./view/list');
var Pool = require('./view/pool');
var DragAndDrop = require('./view/drag');

/**
 * FileUploader act like bridge between connector and view.
 * It makes connector and view with option and environment.
 * It control and make connection among modules.
 * @constructor
 * @param {object} options The options to set up file uploader modules.
 *  @param {object} options.url The url is file server.
 *      @param {string} options.url.send The url is for file attach.
 *      @param {string} options.url.remove The url is for file detach.
 *  @param {object} options.helper The helper object info is for x-domain.
 *      @param {string} options.helper.url The url is helper page url.
 *      @param {string} options.helper.name The name of hidden element for sending server helper page information.
 *  @param {string} options.resultTypeElementName The type of hidden element for sending server response type information.
 *  @param {string} options.formTarget The target for x-domain jsonp case.
 *  @param {string} options.callbackName The name of jsonp callback function.
 *  @param {object} options.listInfo The element info to display file list information.
 *  @param {string} options.separator The separator for jsonp helper response.
 *  @param {string} [options.fileField=userFile] The field name of input file element.
 *  @param {boolean} options.useFolder Whether select unit is folder of not. If this is ture, multiple will be ignored.
 *  @param {boolean} options.isMultiple Whether enable multiple select or not.
 * @param {jQuery} $el Root Element of Uploader
 * @example
 * var uploader = new tui.component.Uploader({
 *     url: {
 *         send: "http://fe.nhnent.com/etc/etc/uploader/uploader.php",
 *         remove: "http://fe.nhnent.com/etc/etc/uploader/remove.php"
 *     },
 *     helper: {
 *         url: 'http://10.77.34.126:8009/samples/response.html',
 *         name: 'REDIRECT_URL'
 *     },
 *     resultTypeElementName: 'RESPONSE_TYPE',
 *     formTarget: 'hiddenFrame',
 *     callbackName: 'responseCallback',
 *     listInfo: {
 *         list: $('#files'),
 *         count: $('#file_count'),
 *         size: $('#size_count')
 *     },
 *     separator: ';'
 * }, $('#uploader'));
 */
var Uploader = tui.util.defineClass(/**@lends Uploader.prototype */{
    /**
     * initialize
     */
    init: function(options, $el) {
        this._setData(options);
        this._setConnector();

        this.$el = $el;

        if(this.useDrag && !this.useFolder && utils.isSupportFileSystem()) {
            this.dragView = new DragAndDrop(options, this);
        }

        this.inputView = new Input(options, this);
        this.listView = new List(options, this);

        this.fileField = this.fileField || consts.CONF.FILE_FILED_NAME;
        this._pool = new Pool(this.inputView.$el[0]);
        this._addEvent();
    },

    /**
     * Set Connector
     * @private
     */
    _setConnector: function() {
        if (this.isBatchTransfer) {
            this.type = 'local';
        } else if (this.isCrossDomain()) {
            if (this.helper) {
                this.type = 'jsonp';
            } else {
                alert(consts.CONF.ERROR.NOT_SURPPORT);
                this.type = 'local';
            }
        } else {
            if (this.useJsonp || !utils.isSupportFormData()) {
                this.type = 'jsonp';
            } else {
                this.type = 'ajax';
            }
        }
        this._connector = conn.getConnector(this);
    },

    /**
     * Update list view with custom or original data.
     * @param {object} info The data for update list
     *  @param {string} info.action The action name to execute method
     */
    notify: function(info) {
        this.listView.update(info);
        this.listView.updateTotalInfo(info);
    },

    /**
     * Set field data by option values.
     * @param options
     * @private
     */
    _setData: function(options) {
        tui.util.extend(this, options);
    },

    /**
     * Extract protocol + domain from url to find out whether cross-domain or not.
     * @returns {boolean}
     */
    isCrossDomain: function() {
        var pageDomain = document.domain;
        return this.url.send.indexOf(pageDomain) === -1;
    },

    /**
     * Callback for error
     * @param {object} response Error response
     */
    errorCallback: function(response) {
        var message;
        if (response && response.msg) {
            message = response.msg;
        } else {
            message = consts.CONF.ERROR.DEFAULT;
        }
        alert(message);
    },

    /**
     * Callback for custom send event
     * @param {object} [data] The data include callback function for file clone
     */
    sendFile: function(data) {
        var callback = tui.util.bind(this.notify, this),
            files = data && data.files;

        this._connector.addRequest({
            type: 'add',
            success: function(result) {
                if (data && data.callback) {
                    data.callback(result);
                }
                callback(result);
            },
            error: this.errorCallback
        }, files);
    },

    /**
     * Callback for custom remove event
     * @param {object} data The data for remove file.
     */
    removeFile: function(data) {
        var callback = tui.util.bind(this.notify, this);
        this._connector.removeRequest({
            type: 'remove',
            data: data,
            success: callback
        });
    },

    /**
     * Submit for data submit to server
     * @api
     */
    submit: function() {
        if (this._connector.submit) {
            if (utils.isSupportFormData()) {
                this._connector.submit(tui.util.bind(function() {
                    /**
                     * @api
                     * @event Uploader#batchSuccess
                     * @param {Uploader} uploader - uploader instance
                     */
                    this.fire('batchSuccess', this);
                }, this));
            } else {
                this._pool.plant();
            }
        }
    },

    /**
     * Get file info locally
     * @param {HtmlElement} element Input element
     * @private
     */
    _getFileInfo: function(element) {
        var files;
        if (utils.isSupportFileSystem()) {
            files = this._getFileList(element.files);
        } else {
            files = {
                name: element.value,
                id: element.value
            };
        }
        return files;
    },

    /**
     * Get file list from FileList object
     * @param {FileList} files A FileList object
     * @returns {Array}
     * @private
     */
    _getFileList: function(files) {
        return tui.util.map(files, function(file) {
            return {
                name: file.name,
                size: file.size,
                id: file.name
            };
        });
    },

    /**
     * Add event to listview and inputview
     * @private
     */
    _addEvent: function() {
        var self = this;

        if(this.useDrag && this.dragView) {
            // @todo top 처리가 따로 필요함, sendFile 사용 안됨
            this.dragView.on('drop', this.sendFile, this);
        }
        if (this.isBatchTransfer) {
            this.inputView.on('save', this.sendFile, this);
            this.listView.on('remove', this.removeFile, this);
        } else {
            this.inputView.on('change', this.sendFile, this);
            this.listView.on('remove', this.removeFile, this);
        }

        /**
         * Custom Events
         * @api
         * @event Uploader#fileAdded
         * @param {object} target - Target item information
         */
        this.listView.on('fileAdded', function(target) {
            self.fire('fileAdded', target);
        });

        /**
         * Custom Events
         * @api
         * @event Uploader#fileRemoved
         * @param {object} name - The file name to remove
         */
        this.listView.on('fileRemoved', function(name) {
            self.fire('fileRemoved', name);
        });
    },

    /**
     * Store input element to pool.
     * @param {HTMLElement} input A input element[type=file] for store pool
     */
    store: function(input) {
        this._pool.store(input);
    },

    /**
     * Remove input element form pool.
     * @param {string} name The file name to remove
     */
    remove: function(name) {
        if (!utils.isSupportFormData()) {
            this._pool.remove(name);
        }
    }
});

tui.util.CustomEvents.mixin(Uploader);
module.exports = Uploader;

},{"./connector/connector":3,"./consts":6,"./utils":8,"./view/drag":9,"./view/input":10,"./view/list":12,"./view/pool":13}],8:[function(require,module,exports){
/**
 * @fileoverview This file contain utility methods for uploader.
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */

'use strict';
/**
 * @namespace utils
 */
/**
 * Extract unit for file size
 * @param {number} bytes A usage of file
 * @memberof utils
 */
var getFileSizeWithUnit = function(bytes) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB'],
        bytes = parseInt(bytes, 10),
        exp = Math.log(bytes) / Math.log(1024) | 0,
        result = (bytes / Math.pow(1024, exp)).toFixed(2);

    return result + units[exp];
};

/**
 * Whether the browser support FormData or not
 * @memberof utils
 */
var isSupportFormData = function() {
    var FormData = (window.FormData || null);
    return !!FormData;
};

/**
 * Get item elements HTML
 * @param {string} html HTML template
 * @returns {string}
 * @memberof utils
 */
var template = function(map, html) {
    html = html.replace(/\{\{([^\}]+)\}\}/g, function(mstr, name) {
        return map[name];
    });
    return html;
};

/**
 * Check whether support file api or not
 * @returns {boolean}
 * @memberof utils
 */
var isSupportFileSystem = function() {
    return !!(window.File && window.FileReader && window.FileList && window.Blob);
};

module.exports = {
    getFileSizeWithUnit: getFileSizeWithUnit,
    isSupportFileSystem: isSupportFileSystem,
    isSupportFormData: isSupportFormData,
    template: template
};

},{}],9:[function(require,module,exports){
/**
 * @fileoverview This file is about drag and drop file to send. Drag and drop is running via file api.
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var consts = require('../consts');
var utils = require('../utils');

/**
 * Makes drag and drop area, the dropped file is added via event drop event.
 * @class View.DragAndDrop
 */
var DragAndDrop = tui.util.defineClass(/** @lends View.DragAndDrop.prototype */{
    /**
     * initialize DragAndDrop
     */
    init: function(options, uploader) {
        var html = options.template && options.template.drag || consts.HTML.drag;
        this._enableClass = options.drag && options.drag.enableClass || consts.CONF.DRAG_DEFAULT_ENABLE_CLASS;
        this._render(html, uploader);
        this._addEvent();
    },

    /**
     * Renders drag and drop area
     * @param {string} html The html string to make darg zone
     * @param {object} uploader The core instance of this component
     * @private
     */
    _render: function(html, uploader) {
        this.$el = $(html);
        uploader.$el.append(this.$el);
    },

    /**
     * Adds drag and drop event
     * @private
     */
    _addEvent: function() {
        this.$el.on('dragenter', tui.util.bind(this.onDragEnter, this));
        this.$el.on('dragover', tui.util.bind(this.onDragOver, this));
        this.$el.on('drop', tui.util.bind(this.onDrop, this));
        this.$el.on('dragleave', tui.util.bind(this.onDragLeave, this));
    },

    /**
     * Handles dragenter event
     */
    onDragEnter: function(e) {
        e.preventDefault();
        e.stopPropagation();
        this._enable();
    },

    /**
     * Handles dragover event
     */
    onDragOver: function(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    /**
     * Handles dragleave event
     */
    onDragLeave: function(e) {
        e.preventDefault();
        e.stopPropagation();
        this._disable();
    },

    /**
     * Handles drop event
     */
    onDrop: function(e) {
        e.preventDefault();
        this._disable();
        this.fire('drop', {
            files: e.originalEvent.dataTransfer.files
        });
        return false;
    },

    _enable: function() {
        this.$el.addClass(this._enableClass);
    },

    _disable: function() {
        this.$el.removeClass(this._enableClass);
    }
});

tui.util.CustomEvents.mixin(DragAndDrop);

module.exports = DragAndDrop;

},{"../consts":6,"../utils":8}],10:[function(require,module,exports){
/**
 * @fileoverview InputView make input form by template. Add event file upload event.
 * @dependency ne-code-snippet 1.0.3, jquery1.8.3
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var consts = require('../consts');
var utils = require('../utils');

/**
 * This view control input element typed file.
 * @constructor View.InputView
 */
var Input = tui.util.defineClass(/**@lends View.Input.prototype **/{
    /**
     * Initialize input element.
     * @param {object} [options]
     */
    init: function(options, uploader) {

        this._uploader = uploader;
        this._target = options.formTarget;
        this._url = options.url;
        this._isBatchTransfer = options.isBatchTransfer;
        this._isMultiple = !!(utils.isSupportFormData() && options.isMultiple);
        this._useFolder = !!(utils.isSupportFormData() && options.useFolder);

        this._html = this._setHTML(options.template);

        this._render();
        this._renderHiddenElements();

        if (options.helper) {
            this._makeBridgeInfoElement(options.helper);
        }

        this._addEvent();
    },

    /**
     * Render input area
     * @private
     */
    _render: function() {
        this.$el = $(this._getHtml());
        this.$el.attr({
            action: this._url.send,
            method: 'post',
            enctype: "multipart/form-data",
            target: (!this._isBatchTransfer ? this._target : '')
        });
        this.$input = this._getInputElement();
        this.$submit = this._getSubmitElement();
        this.$input.appendTo(this.$el);
        if (this.$submit) {
            this.$submit.appendTo(this.$el);
        }
        this._uploader.$el.append(this.$el);
    },

    /**
     * Set all of input elements html strings.
     * @param {object} [template] The template is set form customer.
     * @return {object} The html string set for inputView
     */
    _setHTML: function(template) {
        if (!template) {
            template = {};
        }

        return {
            input: template.input || consts.HTML.input,
            submit: template.submit || consts.HTML.submit,
            form: template.form || consts.HTML.form
        }
    },
    /**
     * Get html string from template
     * @return {object}
     * @private
     */
    _getHtml: function() {
        return this._html.form;
    },

    /**
     * Makes and returns jquery element
     * @return {object} The jquery object wrapping original input element
     */
    _getInputElement: function() {
        var map = {
            multiple: this._isMultiple ? 'multiple' : '',
            fileField: this._uploader.fileField,
            webkitdirectory: this._useFolder ? 'webkitdirectory' : ''
        };

        return $(utils.template(map, this._html.input));
    },

    /**
     * Makes and returns jquery element
     * @return {object} The jquery object wrapping sumbit button element
     */
    _getSubmitElement: function() {
        if (this._isBatchTransfer) {
            return $(this._html.submit);
        } else {
            return false;
        }
    },

    /**
     * Call methods those make each hidden element.
     * @private
     */
    _renderHiddenElements: function() {
        this._makeTargetFrame();
        this._makeResultTypeElement();
        this._makeCallbackElement();
    },

    /**
     * Add event
     * @private
     */
    _addEvent: function() {
        if (this._isBatchTransfer) {
            if (utils.isSupportFormData()) {
                this.$el.on('submit', tui.util.bind(function (event) {
                    event.preventDefault();
                    this._uploader.submit();
                }, this));
            } else {
                this.$el.on('submit', tui.util.bind(function () {
                    this._uploader.submit();
                }, this));
            }
        }
        this._addInputEvent();
    },

    /**
     * Add input element change event by sending type
     * @private
     */
    _addInputEvent: function() {
        if (this._isBatchTransfer) {
            this.$input.on('change', tui.util.bind(this.onSave, this));
        } else {
            this.$input.on('change', tui.util.bind(this.onChange, this));
        }
    },

    /**
     * Event-Handle for input element change
     */
    onChange: function() {
        if (!this.$input[0].value) {
            return;
        }
        this.fire('change', {
            target: this
        });
    },

    /**
     * Event-Handle for save input element
     */
    onSave: function() {
        if (!this.$input[0].value) {
            return;
        }
        var saveCallback = !utils.isSupportFormData() ? tui.util.bind(this._resetInputElement, this) : null;
        this.fire('save', {
            element: this.$input[0],
            callback: saveCallback
        });
    },

    /**
     * Reset Input element to save whole input=file element.
     */
    _resetInputElement: function() {
        this.$input.off();
        this._clone(this.$input[0]);
        this.$input = this._getInputElement();
        if (this.$submit) {
            this.$submit.before(this.$input);
        } else {
            this.$el.append(this.$input);
        }
        this._addInputEvent();
    },

    /**
     * Makes element to be target of submit form element.
     * @private
     */
    _makeTargetFrame: function() {
        this._$target = $('<iframe name="' + this._target + '"></iframe>');
        this._$target.css({
            visibility: 'hidden',
            position: 'absolute'
        });
        this._uploader.$el.append(this._$target);
    },

    /**
     * Make element to be callback function name
     * @private
     */
    _makeCallbackElement: function() {
        this._$callback = this._makeHiddenElement({
            'name': consts.CONF.JSONPCALLBACK_NAME,
            'value': this._uploader.callbackName
        });
        this.$el.append(this._$callback);
    },

    /**
     * Makes element to know which type request
     * @private
     */
    _makeResultTypeElement: function() {
        this._$resType = this._makeHiddenElement({
            'name' : this._uploader.resultTypeElementName || consts.CONF.RESPONSE_TYPE,
            'value': this._uploader.type
        });
        this.$el.append(this._$resType);
    },

    /**
     * Make element that has redirect page information used by Server side.
     * @param {object} helper Redirection information for clear x-domain problem.
     * @private
     */
    _makeBridgeInfoElement: function(helper) {
        this._$helper = this._makeHiddenElement({
            'name' : helper.name || consts.CONF.REDIRECT_URL,
            'value': helper.url
        });
        this.$el.append(this._$helper);
    },

    /**
     * Make hidden input element with options
     * @param {object} options The opitons to be attribute of input
     * @returns {*|jQuery}
     * @private
     */
    _makeHiddenElement: function(options) {
        tui.util.extend(options, {
            type: 'hidden'
        });
        return $('<input />').attr(options);
    },

    /**
     * Ask uploader to save input element to pool
     * @param {HTMLElement} input A input element[type=file] for store pool
     */
    _clone: function(input) {
        input.file_name = input.value;
        this._uploader.store(input);
    }

});

tui.util.CustomEvents.mixin(Input);

module.exports = Input;

},{"../consts":6,"../utils":8}],11:[function(require,module,exports){
/**
 * @fileoverview ItemView make element to display added file information. It has attached file ID to request for remove.
 * @dependency ne-code-snippet 1.0.3, jquery1.8.3
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var consts = require('../consts');
var utils = require('../utils');

/**
 * Class of item that is member of file list.
 * @class View.Item
 */
var Item = tui.util.defineClass(/** @lends View.Item.prototype **/ {
    /**
     * Initialize item
     * @param {object} options
     *  @param {string} options.name File name
     *  @param {string} options.type File type
     *  @param {object} options.root List object
     *  @param {string} options.hiddenFrame The iframe name will be target of form submit.
     *  @param {string} options.url The url for form action to submet.
     *  @param {string} [options.id] Unique key, what if the key is not exist id will be the file name.
     *  @param {string} [options.hiddenFieldName] The name of hidden filed. The hidden field is for connecting x-domian.
     *  @param {string} [options.deleteButtonClassName='uploader_btn_delete'] The class name is for delete button.
     *  @param {(string|number)} [options.size] File size (but ie low browser, x-domain)
     *  @param {object} [options.helper] The helper page info.
     */
    init: function(options) {

        this._setRoot(options);
        this._setItemInfo(options);
        this._setConnectInfo(options);

        this.render(options.template || consts.HTML.item);

        if (options.helper) {
            this._makeBridgeInfoElement(options.helper);
        }
    },

    /**
     * Set root(List object) information.
     * @param {object} options Same with init options parameter.
     * @private
     */
    _setRoot: function(options) {
        this._root = options.root;
        this._$root = options.root.$el;
    },

    /**
     * Set file information.
     * @param {object} options Same with init options parameter.
     * @private
     */
    _setItemInfo: function(options) {
        this.name = options.name;
        this._type = options.type || this._extractExtension();
        this._id = options.id || options.name;
        this.size = options.size || '';
        this._btnClass = options.deleteButtonClassName || 'uploader_btn_delete';
        this._unit = options.unit || 'KB';
    },

    /**
     * Set connect element information.
     * @param {object} options Same with init options parameter.
     * @private
     */
    _setConnectInfo: function(options) {
        this._url = options.url;
        this._hiddenInputName = options.hiddenFieldName || 'filename';
    },

    /**
     * Render making form padding with deletable item
     * @param template
     */
    render: function(template) {
        var html = this._getHtml(template);
        this._$el = $(html);
        this._$root.append(this._$el);
        this._addEvent();
    },

    /**
     * Extract file extension by name
     * @returns {string}
     * @private
     */
    _extractExtension: function() {
        return this.name.split('.').pop();
    },

    /**
     * Make element that has redirect page information used by Server side.
     * @param {object} helper Redirection helper page information for clear x-domain problem.
     * @private
     */
    _makeBridgeInfoElement: function(helper) {
        this.$helper = $('<input />');
        this.$helper.attr({
            'name' : helper.name,
            'value': helper.url
        });
    },

    /**
     * Get item elemen HTML
     * @param {string} html HTML template
     * @returns {string}
     * @private
     */
    _getHtml: function(html) {
        var map = {
            filetype: this._type,
            filename: this.name,
            filesize: this.size ? utils.getFileSizeWithUnit(this.size) : '',
            deleteButtonClassName: this._btnClass
        };

        return utils.template(map, html);
    },

    /**
     * Destory item
     */
    destroy: function() {
        this._removeEvent();
        this._$el.remove();
    },

    /**
     * Add event handler on delete button.
     * @private
     */
    _addEvent: function() {
        var query = '.' + this._btnClass,
            $delBtn = this._$el.find(query);
        $delBtn.on('click', tui.util.bind(this._onClickEvent, this));
    },

    /**
     * Remove event handler from delete button.
     * @private
     */
    _removeEvent: function() {
        var query = '.' + this._btnClass,
            $delBtn = this._$el.find(query);
        $delBtn.off('click');
    },


    /**
     * Event-handle for delete button clicked.
     * @private
     */
    _onClickEvent: function() {
        this.fire('remove', {
            filename : this.name,
            id : this._id,
            type: 'remove'
        });
    }
});

tui.util.CustomEvents.mixin(Item);

module.exports = Item;

},{"../consts":6,"../utils":8}],12:[function(require,module,exports){
/**
 * @fileoverview FileListView manage and display files state(like size, count) and list.
 * @dependency ne-code-snippet 1.0.3, jquery1.8.3
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var utils = require('../utils');
var Item = require('./item');

/**
 * List has items. It can add and remove item, and get total usage.
 * @class View.List
 */
var List = tui.util.defineClass(/** @lends View.List.prototype */{
    init : function(options, uploader) {
        var listInfo = options.listInfo;
        this.items = [];
        this.$el = listInfo.list;
        this.$counter = listInfo.count;
        this.$size = listInfo.size;
        this._uploader = uploader;

        tui.util.extend(this, options);
    },

    /**
     * Update item list
     * @param {object} info A information to update list.
     *  @param {array} info.items The list of file information.
     *  @param {string} [info.action] The action to do.
     */
    update: function(info) {
        if (info.action === 'remove') {
            this._removeFileItem(info.name);
        } else {
            this._addFileItems(info.items);
        }
    },

    /**
     * Update items total count, total size information.
     * @param {object} info A information to update list.
     *  @param {array} info.items The list of file information.
     *  @param {string} info.size The total size.
     *  @param {string} info.count The count of files.
     */
    updateTotalInfo: function(info) {
        this._updateTotalCount(info.count);
        this._updateTotalUsage(info.size);
    },

    /**
     * Update items total count and refresh element
     * @param {(number|string)} [count] Total file count
     * @private
     */
    _updateTotalCount: function(count) {

        if (!tui.util.isExisty(count)) {
            count = this.items.length;
        }

        this.$counter.html(count);
    },

    /**
     * Update items total size and refresh element
     * @param {(number|string)} size Total files sizes
     * @private
     */
    _updateTotalUsage: function(size) {

        if (!tui.util.isExisty(size)) {
            size = this._getSumAllItemUsage();
        }
        if (tui.util.isNumber(size) && !isNaN(size)) {
            size = utils.getFileSizeWithUnit(size);
            this.$size.html(size);
            this.$size.show();
        } else {
            this.$size.hide();
        }
    },

    /**
     * Sum sizes of all items.
     * @returns {*}
     * @private
     */
    _getSumAllItemUsage: function() {
        var items = this.items,
            totalUsage = 0;

        tui.util.forEach(items, function(item) {
            totalUsage += parseFloat(item.size);
        });

        return totalUsage;
    },

    /**
     * Add file items
     * @param {object} target Target item information.
     * @private
     */
    _addFileItems: function(target) {
        if (!tui.util.isArray(target)) {
            target = [target];
        }
        tui.util.forEach(target, function(data) {
            this.items.push(this._createItem(data));
        }, this);

        this.fire('fileAdded', {
            target: target
        });
    },

    /**
     * Remove file item
     * @param {string} name The file name to remove
     * @private
     */
    _removeFileItem: function(name) {
        name = decodeURIComponent(name);
        tui.util.forEach(this.items, function(item, index) {
            if (name === decodeURIComponent(item.name)) {
                item.destroy();
                this._uploader.remove(name);
                this.fire('fileRemoved', {
                    name: name
                });
                this.items.splice(index, 1);
                return false;
            }
        }, this);
    },

    /**
     * Create item By Data
     * @param {object} data
     * @returns {Item}
     * @private
     */
    _createItem: function(data) {
        var item = new Item({
            root: this,
            name: data.name,
            size: data.size,
            deleteButtonClassName: this.deleteButtonClassName,
            url: this.url,
            hiddenFrame: this.formTarget,
            hiddenFieldName: this.hiddenFieldName,
            template: this.template && this.template.item
        });
        item.on('remove', this._removeFile, this);
        return item;
    },

    /**
     * Callback Remove File
     * @param data
     * @private
     */
    _removeFile: function(data) {
        this.fire('remove', data);
    }
});

tui.util.CustomEvents.mixin(List);

module.exports = List;

},{"../utils":8,"./item":11}],13:[function(require,module,exports){
/**
 * @fileoverview This is manager of input elements that act like file pool.
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var forEach = tui.util.forEach;

/**
 * The pool for save files.
 * It's only for input[file] element save at browser that does not support file api.
 * @class View.Pool
 */
var Pool = tui.util.defineClass(/** @lends View.Pool.prototype */{
    /**
     * initialize
     */
    init: function(planet) {
        /**
         * Submitter for file element to server
         * @type {HTMLElement}
         */
        this.planet = planet;
        /**
         * File data structure object(key=name : value=iuput elmeent);
         * @type {object}
         */
        this.files = {};
        /**
         * Acts pool to save input element
         * @type {DocumentFragment}
         */
        this.frag = document.createDocumentFragment();
    },

    /**
     * Save a input element[type=file], as value of file name.
     * @param {object} file A input element that have to be saved
     * @todo rename variable: "file_name"
     */
    store: function(file) {
        var filename = file.file_name,
            fileElements = this.files[filename] = this.files[filename] || [];
        fileElements.push(file);
        this.frag.appendChild(file);
    },

    /**
     * Remove a input element[type=file] from pool.
     * @param {string} name A file name that have to be removed.
     */
    remove: function(name) {
        var elements = this.files[name];

        if (!elements) {
            return;
        }

        this.frag.removeChild(elements.pop());
        if (!elements.length) {
            delete this.files[name];
        }
    },

    /**
     * Empty pool
     */
    empty: function() {
        this.frag = document.createDocumentFragment();
        this.files = {};
    },

    /**
     * Plant files on pool to form input
     */
    plant: function() {
        var planet = this.planet;
        forEach(this.files, function(elements, filename) {
            forEach(elements, function(element) {
                planet.appendChild(element);
            });
            delete this.files[filename];
        }, this);
    }
});

module.exports = Pool;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy9jb25uZWN0b3IvYWpheC5qcyIsInNyYy9qcy9jb25uZWN0b3IvY29ubmVjdG9yLmpzIiwic3JjL2pzL2Nvbm5lY3Rvci9qc29ucC5qcyIsInNyYy9qcy9jb25uZWN0b3IvbG9jYWwuanMiLCJzcmMvanMvY29uc3RzLmpzIiwic3JjL2pzL3VwbG9hZGVyLmpzIiwic3JjL2pzL3V0aWxzLmpzIiwic3JjL2pzL3ZpZXcvZHJhZy5qcyIsInNyYy9qcy92aWV3L2lucHV0LmpzIiwic3JjL2pzL3ZpZXcvaXRlbS5qcyIsInNyYy9qcy92aWV3L2xpc3QuanMiLCJzcmMvanMvdmlldy9wb29sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ0dWkudXRpbC5kZWZpbmVOYW1lc3BhY2UoJ3R1aS5jb21wb25lbnQuVXBsb2FkZXInLCByZXF1aXJlKCcuL3NyYy9qcy91cGxvYWRlci5qcycpKTtcblxuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFRoaXMgQ29ubmVjdG9yIG1ha2UgY29ubmVjdGlvbiBiZXR3ZWVuIEZpbGVNYW5hZ2VyIGFuZCBmaWxlIHNlcnZlciBhcGkgYXQgbW9kZXJuIGJyb3dzZXIuPGJyPlxuICogICAgIFRoaXMgQ29ubmVjdG9yIHVzZSBhamF4LlxuICogQGRlcGVuZGVuY3kgbmUtY29kZS1zbmlwcGV0IDEuMC4zLCBqcXVlcnkxLjguM1xuICogQGF1dGhvciBOSE4gRW50LiBGRSBEZXZlbG9wbWVudCBUZWFtIDxkbF9qYXZhc2NyaXB0QG5obmVudC5jb20+XG4gKi9cbid1c2Ugc3RyaWN0Jztcbi8qKlxuICogVGhlIG1vZHVsZXMgd2lsbCBiZSBtaXhlZCBpbiBjb25uZWN0b3IgYnkgdHlwZS5cbiAqIEBuYW1lc3BhY2UgQ29ubmVjdG9yLkFqYXhcbiAqL1xudmFyIEFqYXggPSB7LyoqIEBsZW5kcyBDb25uZWN0b3IuQWpheCAqL1xuICAgIHR5cGU6ICdQT1NUJyxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgYWpheCBieSBjb25maWcgdG8gYWRkIGZpbGVzLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZ3VyYXRpb24gZm9yIGFqYXggcmVxdWVzdFxuICAgICAqICBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnVybCBSZXF1ZXN0IHVybCh1cGxvYWQgdXJsIG9yIHJlbW92ZSB1cmwpXG4gICAgICogIEBwYXJhbSB7ZnVuY3Rpb259IGNvbmZpZy5zdWNjZXNzIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gcmVxdWVzdCBzdWNlZXNzLlxuICAgICAqICBAcGFyYW0ge2Z1bmN0aW9ufSBjb25maWcuZXJyb3IgQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiByZXF1ZXN0IGZhaWxkLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGZpbGVzIEZpbGVzXG4gICAgICogIEBtZW1iZXJvZiBDb25uZWN0b3IuQWpheFxuICAgICAqL1xuICAgIGFkZFJlcXVlc3Q6IGZ1bmN0aW9uKGNvbmZpZywgZmlsZXMpIHtcbiAgICAgICAgdmFyIHVwbG9hZGVyID0gdGhpcy5fdXBsb2FkZXIsXG4gICAgICAgICAgICAkZm9ybSA9IHVwbG9hZGVyLmlucHV0Vmlldy4kZWwsXG4gICAgICAgICAgICBjYWxsYmFjayA9IHR1aS51dGlsLmJpbmQodGhpcy5zdWNjZXNzUGFkZGluZywgdGhpcywgY29uZmlnLnN1Y2Nlc3MpO1xuXG4gICAgICAgIGlmIChmaWxlcykge1xuICAgICAgICAgICAgdGhpcy5mb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAgICAgdHVpLnV0aWwuZm9yRWFjaChmaWxlcywgZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9ybURhdGEuYXBwZW5kKHVwbG9hZGVyLmZpbGVGaWVsZCwgZmlsZSk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoJGZvcm1bMF0pO1xuICAgICAgICB9XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuX3VwbG9hZGVyLnVybC5zZW5kLFxuICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxuICAgICAgICAgICAgZGF0YTogdGhpcy5mb3JtRGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGNhbGxiYWNrLFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAgICAgY29udGVudFR5cGU6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IGNvbmZpZy5lcnJvclxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcHJvY2Vzc2luZyBjYWxsYmFjayBiZWZvcmUgY2FsbGJhY2sgcnVuLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFJlcXVlc3QgQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgUmVzcG9uc2UgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yLkFqYXhcbiAgICAgKi9cbiAgICBzdWNjZXNzUGFkZGluZzogZnVuY3Rpb24oY2FsbGJhY2ssIHJlc3BvbnNlKSB7XG4gICAgICAgIHZhciBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSksXG4gICAgICAgICAgICByZXN1bHQgPSB7fTtcblxuICAgICAgICByZXN1bHQuaXRlbXMgPSBqc29uLmZpbGVsaXN0O1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGFqYXggYnkgY29uZmlnIHRvIHJlbW92ZSBmaWxlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgQ29uZmlndXJhdGlvbiBmb3IgcmVtb3ZlXG4gICAgICogQG1lbWJlcm9mIENvbm5lY3Rvci5BamF4XG4gICAgICovXG4gICAgcmVtb3ZlUmVxdWVzdDogZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHR1aS51dGlsLmJpbmQodGhpcy5yZW1vdmVQYWRkaW5nLCB0aGlzLCBjb25maWcuc3VjY2Vzcyk7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuX3VwbG9hZGVyLnVybC5yZW1vdmUsXG4gICAgICAgICAgICBkYXRhOiBjb25maWcuZGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGNhbGxiYWNrLFxuICAgICAgICAgICAgZXJyb3I6IGNvbmZpZy5lcnJvclxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcHJvY2Vzc2luZyByZXNwb25zZSBiZWZvcmUgY2FsbGJhY2sgcnVuLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFJlcXVlc3QgQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgUmVzcG9uc2UgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yLkFqYXhcbiAgICAgKi9cbiAgICByZW1vdmVQYWRkaW5nOiBmdW5jdGlvbihjYWxsYmFjaywgcmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKSxcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuXG4gICAgICAgIHJlc3VsdC5hY3Rpb24gPSAncmVtb3ZlJztcbiAgICAgICAgcmVzdWx0Lm5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQoanNvbi5uYW1lKTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQWpheDtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBBIENvbm5lY3RvciBtYWtlIGNvbm5lY3Rpb24gYmV0d2VlbiBGaWxlTWFuYWdlciBhbmQgZmlsZSBzZXJ2ZXIgQVBJLjxicj4gVGhlIENvbm5lY3RvciBpcyBpbnRlcmZhY2UuXG4gKiBAZGVwZW5kZW5jeSBuZS1jb2RlLXNuaXBwZXQgMS4wLjMsIGpxdWVyeTEuOC4zXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIERldmVsb3BtZW50IFRlYW0gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIEFqYXggPSByZXF1aXJlKCcuL2FqYXgnKTtcbnZhciBKc29ucCA9IHJlcXVpcmUoJy4vanNvbnAnKTtcbnZhciBMb2NhbCA9IHJlcXVpcmUoJy4vbG9jYWwnKTtcblxudmFyIE1vZHVsZVNldHMgPSB7XG4gICAgJ2FqYXgnOiBBamF4LFxuICAgICdqc29ucCc6IEpzb25wLFxuICAgICdsb2NhbCc6IExvY2FsXG59O1xuXG4vKipcbiAqIFRoaXMgaXMgSW50ZXJmYWNlIHRvIGJlIGltcGxlbWVudGVkIGJ5IGNvbm5lY3RvcnNcbiAqIEBuYW1lc3BhY2UgQ29ubmVjdG9yXG4gKi9cbnZhciBDb25uZWN0b3IgPSB7XG4gICAgLyoqXG4gICAgICogQSBpbnRlcmZhY2UgcmVtb3ZlUmVxdWVzdCB0byBpbXBsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBBIGluZm9ybWF0aW9uIGZvciBkZWxldGUgZmlsZVxuICAgICAqIEBtZW1iZXJvZiBDb25uZWN0b3JcbiAgICAgKi9cbiAgICByZW1vdmVSZXF1ZXN0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGludGVyZmFjZSByZW1vdmVSZXF1ZXN0IGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEEgaW50ZXJmYWNlIGFkZFJlcXVlc3QgdG8gaW1wbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgQSBpbmZvcm1hdGlvbiBmb3IgYWRkIGZpbGVcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yXG4gICAgICovXG4gICAgYWRkUmVxdWVzdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBpbnRlcmZhY2UgYWRkUmVxdWVzdCBkb2VzIG5vdCBleGlzdCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogVGhlIGZhY3RvcnkgbW9kdWxlIGZvciBjb25uZWN0b3JzLlxuICogR2V0IGVhY2ggY29ubmVjdG9yIGJ5IGVhY2ggdHlwZS5cbiAqIEBuYW1lc3BhY2UgRmFjdG9yeVxuICovXG52YXIgRmFjdG9yeSA9IHtcbiAgICAvKipcbiAgICAgKiBDaG9vc2UgY29ubmVjdG9yXG4gICAgICogQHBhcmFtIHVwbG9hZGVyXG4gICAgICogQHJldHVybnMge3tfdXBsb2FkZXI6ICp9fVxuICAgICAqIEBtZW1iZXJvZiBGYWN0b3J5XG4gICAgICovXG4gICAgZ2V0Q29ubmVjdG9yOiBmdW5jdGlvbih1cGxvYWRlcikge1xuICAgICAgICB2YXIgdHlwZSA9IHVwbG9hZGVyLnR5cGUudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgIGNvbm4gPSB7XG4gICAgICAgICAgICAgICAgX3VwbG9hZGVyOiB1cGxvYWRlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgdHVpLnV0aWwuZXh0ZW5kKGNvbm4sIENvbm5lY3RvciwgTW9kdWxlU2V0c1t0eXBlXSB8fCBMb2NhbCk7XG4gICAgICAgIHJldHVybiBjb25uO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjdG9yeTtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBUaGlzIENvbm5lY3RvciBtYWtlIGNvbm5lY3Rpb24gYmV0d2VlbiBGaWxlTWFuYWdlciBhbmQgZmlsZSBzZXJ2ZXIgYXBpIGF0IG9sZCBicm93c2VyLjxicj5cbiAqICAgICBUaGlzIENvbm5lY3RvciB1c2UgaGlkZGVuIGlmcmFtZS5cbiAqIEBkZXBlbmRlbmN5IG5lLWNvZGUtc25pcHBldCAxLjAuMywganF1ZXJ5MS44LjNcbiAqIEBhdXRob3IgTkhOIEVudC4gRkUgRGV2ZWxvcG1lbnQgVGVhbSA8ZGxfamF2YXNjcmlwdEBuaG5lbnQuY29tPlxuICovXG4ndXNlIHN0cmljdCc7XG4vKipcbiAqIFRoZSBtb2R1bGVzIHdpbGwgYmUgbWl4ZWQgaW4gY29ubmVjdG9yIGJ5IHR5cGUuXG4gKiBAbmFtZXNwYWNlIENvbm5lY3Rvci5Kc29ucFxuICovXG52YXIgSnNvbnAgPSB7LyoqIEBsZW5kcyBDb25uZWN0b3IuSnNvbnAucHJvdG90eXBlICovXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBieSBmb3JtIHN1Ym1pdC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIENvbmZpZ3VyYXRpb24gZm9yIHN1Ym1pdCBmb3JtLlxuICAgICAqICBAcGFyYW0ge2Z1bmN0aW9ufSBjb25maWcuc3VjY2VzcyBDYWxsYmFjayB3aGVuIHBvc3Qgc3VibWl0IGNvbXBsYXRlLlxuICAgICAqIEBtZW1iZXJvZiBDb25uZWN0b3IuSnNvbnBcbiAgICAgKi9cbiAgICBhZGRSZXF1ZXN0OiBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrTmFtZSA9IHRoaXMuX3VwbG9hZGVyLmNhbGxiYWNrTmFtZSxcbiAgICAgICAgICAgIGNhbGxiYWNrID0gY29uZmlnLnN1Y2Nlc3M7XG5cbiAgICAgICAgdHVpLnV0aWwuZGVmaW5lTmFtZXNwYWNlKGNhbGxiYWNrTmFtZSwgIHR1aS51dGlsLmJpbmQodGhpcy5zdWNjZXNzUGFkZGluZywgdGhpcywgY2FsbGJhY2spKTtcbiAgICAgICAgdGhpcy5fdXBsb2FkZXIuaW5wdXRWaWV3LiRlbC5zdWJtaXQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcHJvY2Vzc2luZyByZXNwb25zZSBiZWZvcmUgY2FsbGJhY2sgcnVuLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFJlcXVlc3QgQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgUmVzcG9uc2UgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yLkpzb25wXG4gICAgICovXG4gICAgc3VjY2Vzc1BhZGRpbmc6IGZ1bmN0aW9uKGNhbGxiYWNrLCByZXNwb25zZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAgICAgaWYgKHRoaXMuX3VwbG9hZGVyLmlzQ3Jvc3NEb21haW4oKSkge1xuICAgICAgICAgICAgcmVzdWx0Lml0ZW1zID0gdGhpcy5fZ2V0U3BsaXRJdGVtcyhyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuaXRlbXMgPSB0dWkudXRpbC50b0FycmF5KHJlc3BvbnNlLmZpbGVsaXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1ha2UgcXVlcnkgZGF0YSB0byBhcnJheVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIFRoZSBEYXRhIGV4dHJhY3RlZCBmcm9tIHF1ZXJ5c3RyaW5nIHNlcGFyYXRlZCBieSAnJidcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZW1iZXJvZiBDb25uZWN0b3IuSnNvbnBcbiAgICAgKi9cbiAgICBfZ2V0U3BsaXRJdGVtczogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB2YXIgc2VwID0gdGhpcy5fdXBsb2FkZXIuc2VwYXJhdG9yLFxuICAgICAgICAgICAgc3RhdHVzID0gZGF0YS5zdGF0dXMuc3BsaXQoc2VwKSxcbiAgICAgICAgICAgIG5hbWVzID0gZGF0YS5uYW1lcy5zcGxpdChzZXApLFxuICAgICAgICAgICAgc2l6ZXMgPSBkYXRhLnNpemVzLnNwbGl0KHNlcCksXG4gICAgICAgICAgICBpZHMgPSB0dWkudXRpbC5pc1N0cmluZyhkYXRhLmlkcykgPyBkYXRhLmlkcy5zcGxpdChzZXApIDogbmFtZXMsXG4gICAgICAgICAgICBpdGVtcyA9IFtdO1xuXG4gICAgICAgIHR1aS51dGlsLmZvckVhY2goc3RhdHVzLCBmdW5jdGlvbihpdGVtLCBpbmRleCkge1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgIHZhciBuSXRlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZXNbaW5kZXhdLFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IHN0YXR1c1tpbmRleF0sXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IHNpemVzW2luZGV4XSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkc1tpbmRleF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2gobkl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGFqYXggYnkgY29uZmlnIHRvIHJlbW92ZSBmaWxlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yLkpzb25wXG4gICAgICovXG4gICAgcmVtb3ZlUmVxdWVzdDogZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIHZhciBjYWxsYmFja05hbWUgPSB0aGlzLl91cGxvYWRlci5jYWxsYmFja05hbWUsXG4gICAgICAgICAgICBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja05hbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjayA9IGNvbmZpZy5zdWNjZXNzO1xuXG4gICAgICAgIHR1aS51dGlsLmRlZmluZU5hbWVzcGFjZShjYWxsYmFja05hbWUsIHR1aS51dGlsLmJpbmQodGhpcy5yZW1vdmVQYWRkaW5nLCB0aGlzLCBjYWxsYmFjayksIHRydWUpO1xuXG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuX3VwbG9hZGVyLnVybC5yZW1vdmUsXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb25wJyxcbiAgICAgICAgICAgIGpzb25wOiBjYWxsYmFja05hbWUsXG4gICAgICAgICAgICBkYXRhOiB0dWkudXRpbC5leHRlbmQoZGF0YSwgY29uZmlnLmRhdGEpXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXByb2Nlc3NpbmcgcmVzcG9uc2UgYmVmb3JlIGNhbGxiYWNrIHJ1bi5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBSZXF1ZXN0IENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIFJlc3BvbnNlIGZyb20gc2VydmVyXG4gICAgICogQG1lbWJlcm9mIENvbm5lY3Rvci5Kc29ucFxuICAgICAqL1xuICAgIHJlbW92ZVBhZGRpbmc6IGZ1bmN0aW9uKGNhbGxiYWNrLCByZXNwb25zZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgIHJlc3VsdC5hY3Rpb24gPSAncmVtb3ZlJztcbiAgICAgICAgcmVzdWx0Lm5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQocmVzcG9uc2UubmFtZSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEpzb25wO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXZpZXcgVGhpcyBDb25uZWN0b3IgbWFrZSBjb25uZWN0aW9uIGJldHdlZW4gVXBsb2FkZXIgYW5kIGh0bWw1IGZpbGUgYXBpLlxuICogQGF1dGhvciBOSE4gRW50LiBGRSBEZXZlbG9wbWVudCBUZWFtIDxkbF9qYXZhc2NyaXB0QG5obmVudC5jb20+XG4gKi9cbid1c2Ugc3RyaWN0JztcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbi8qKlxuICogVGhlIG1vZHVsZXMgd2lsbCBiZSBtaXhlZCBpbiBjb25uZWN0b3IgYnkgdHlwZS5cbiAqIEBuYW1lc3BhY2UgQ29ubmVjdG9yLkxvY2FsXG4gKi9cbnZhciBMb2NhbCA9IHsvKiogQGxlbmRzIENvbm5lY3Rvci5Mb2NhbC5wcm90b3R5cGUgKi9cbiAgICBfaXNTdXBwb3J0aW5nRm9ybURhdGE6IHV0aWxzLmlzU3VwcG9ydEZvcm1EYXRhKCksXG4gICAgLyoqXG4gICAgICogQSByZXN1bHQgYXJyYXkgdG8gc2F2ZSBmaWxlIHRvIHNlbmQuXG4gICAgICovXG4gICAgX3Jlc3VsdCA6IG51bGwsXG4gICAgLyoqXG4gICAgICogQWRkIFJlcXVlc3QsIHNhdmUgZmlsZXMgdG8gYXJyYXkuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgVGhlIGRhdGEgb2YgY29ubmVjdGlvbiBmb3Igc2VydmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtmaWxlc10gVGhlIGZpbGVzIHRvIHNhdmVcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yLkxvY2FsXG4gICAgICovXG4gICAgYWRkUmVxdWVzdDogZnVuY3Rpb24oZGF0YSwgZmlsZXMpIHtcbiAgICAgICAgdmFyIGlzVmFsaWRQb29sID0gdXRpbHMuaXNTdXBwb3J0Rm9ybURhdGEoKSxcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuX3NhdmVGaWxlKGlzVmFsaWRQb29sLCBmaWxlcyk7XG5cbiAgICAgICAgZGF0YS5zdWNjZXNzKHtcbiAgICAgICAgICAgIGl0ZW1zOiByZXN1bHRcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgZmlsZSB0byBwb29sXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc1N1cHBvcnRBamF4IFdoZXRoZXIgRm9ybURhdGEgaXMgc3VwcG9ydGVkIG9yIG5vdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbZmlsZXNdIFRoZSBmaWxlcyB0byBzYXZlXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yLkxvY2FsXG4gICAgICovXG4gICAgX3NhdmVGaWxlOiBmdW5jdGlvbihpc1N1cHBvcnRBamF4LCBmaWxlcykge1xuICAgICAgICB2YXIgdXBsb2FkZXIgPSB0aGlzLl91cGxvYWRlcixcbiAgICAgICAgICAgIGlucHV0VmlldyA9IHVwbG9hZGVyLmlucHV0VmlldyxcbiAgICAgICAgICAgIGZpbGVFbCA9IGlucHV0Vmlldy4kaW5wdXRbMF0sXG4gICAgICAgICAgICByZXN1bHQgPSBbXTtcblxuICAgICAgICBpZiAoIXRoaXMuX3Jlc3VsdCkge1xuICAgICAgICAgICAgdGhpcy5fcmVzdWx0ID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNTdXBwb3J0QWpheCkge1xuICAgICAgICAgICAgZmlsZXMgPSB0dWkudXRpbC50b0FycmF5KGZpbGVzIHx8IGZpbGVFbC5maWxlcyk7XG4gICAgICAgICAgICB0dWkudXRpbC5mb3JFYWNoKGZpbGVzLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR1aS51dGlsLmlzT2JqZWN0KGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IGZpbGVFbC52YWx1ZSxcbiAgICAgICAgICAgICAgICBlbGVtZW50OiBmaWxlRWxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcmVzdWx0ID0gdGhpcy5fcmVzdWx0LmNvbmNhdChyZXN1bHQpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNYWtlcyBmb3JtIGRhdGEgdG8gc2VuZCBQT1NUKEZvcm1EYXRlIHN1cHBvcnRlZCBjYXNlKVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1lbWJlcm9mIENvbm5lY3Rvci5Mb2NhbFxuICAgICAqL1xuICAgIF9tYWtlRm9ybURhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdXBsb2FkZXIgPSB0aGlzLl91cGxvYWRlcixcbiAgICAgICAgICAgIGZpZWxkID0gdXBsb2FkZXIuZmlsZUZpZWxkLFxuICAgICAgICAgICAgaW5wdXQgPSB1cGxvYWRlci5pbnB1dFZpZXcsXG4gICAgICAgICAgICBmb3JtID0gbmV3IHdpbmRvdy5Gb3JtRGF0YSh0aGlzLl9leHRyYWN0Rm9ybShpbnB1dCkpO1xuXG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5fcmVzdWx0LCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICBmb3JtLmFwcGVuZChmaWVsZCwgaXRlbSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZm9ybTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgRm9ybSBmcm9tIGlucHV0Vmlld1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnB1dCBUaGUgaW5wdXQgdmlldyBmb3IgZXh0cmFjdGluZ1xuICAgICAqIEBtZW1iZXJvZiBDb25uZWN0b3IuTG9jYWxcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9leHRyYWN0Rm9ybTogZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgdmFyIGZvcm0gPSBpbnB1dC4kZWwuY2xvbmUoKTtcbiAgICAgICAgZm9ybS5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpLnJlbW92ZSgpO1xuICAgICAgICByZXR1cm4gZm9ybVswXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGZpbGUgZm9ybSByZXN1bHQgYXJyYXlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5mbyBUaGUgaW5mb3JtYXRpb24gc2V0IHRvIHJlbW92ZSBmaWxlXG4gICAgICogQG1lbWJlcm9mIENvbm5lY3Rvci5Mb2NhbFxuICAgICAqL1xuICAgIHJlbW92ZVJlcXVlc3Q6IGZ1bmN0aW9uKGluZm8pIHtcbiAgICAgICAgdmFyIGRhdGEgPSBpbmZvLmRhdGEsXG4gICAgICAgICAgICBmaWxlbmFtZSA9IGRhdGEuZmlsZW5hbWUsXG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLl9yZXN1bHQ7XG5cbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaChyZXN1bHQsIGZ1bmN0aW9uKGVsLCBpbmRleCkge1xuICAgICAgICAgICAgaWYgKGVsLm5hbWUgPT09IGZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpbmZvLnN1Y2Nlc3Moe1xuICAgICAgICAgICAgYWN0aW9uOiAncmVtb3ZlJyxcbiAgICAgICAgICAgIG5hbWU6IGRhdGEuZmlsZW5hbWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgZmlsZXMgaW4gYSBiYXRjaC5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAbWVtYmVyb2YgQ29ubmVjdG9yLkxvY2FsXG4gICAgICovXG4gICAgc3VibWl0OiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgZm9ybSA9IHRoaXMuX21ha2VGb3JtRGF0YSh0aGlzLl91cGxvYWRlci5pbnB1dFZpZXcpO1xuXG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuX3VwbG9hZGVyLnVybC5zZW5kLFxuICAgICAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZm9ybSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGNhbGxiYWNrLFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAgICAgY29udGVudFR5cGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWw7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ29uZmlndXJhdGlvbiBvciBkZWZhdWx0IHZhbHVlcy5cbiAqIEBhdXRob3IgTkhOIEVudC4gRkUgRGV2ZWxvcG1lbnQgVGVhbSA8ZGxfamF2YXNjcmlwdEBuaG5lbnQuY29tPlxuICovXG4ndXNlIHN0cmljdCc7XG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb2YgY29ubmVjdGlvbiB3aXRoIHNlcnZlci5cbiAqIEB0eXBlIHt7UkVTUE9OU0VfVFlQRTogc3RyaW5nLCBSRURJUkVDVF9VUkw6IHN0cmluZ319XG4gKi9cbm1vZHVsZS5leHBvcnRzLkNPTkYgPSB7XG4gICAgUkVTUE9OU0VfVFlQRTogJ1JFU1BPTlNFX1RZUEUnLFxuICAgIFJFRElSRUNUX1VSTDogJ1JFRElSRUNUX1VSTCcsXG4gICAgSlNPTlBDQUxMQkFDS19OQU1FOiAnQ0FMTEJBQ0tfTkFNRScsXG4gICAgU0laRV9VTklUOiAnU0laRV9VTklUJyxcbiAgICBSRU1PVkVfQ0FMTEJBQ0sgOiAncmVzcG9uc2VSZW1vdmVDYWxsYmFjaycsXG4gICAgRVJST1I6IHtcbiAgICAgICAgREVGQVVMVDogJ1Vua25vd24gZXJyb3IuJyxcbiAgICAgICAgTk9UX1NVUlBQT1JUOiAnVGhpcyBpcyB4LWRvbWFpbiBjb25uZWN0aW9uLCB5b3UgaGF2ZSB0byBtYWtlIGhlbHBlciBwYWdlLidcbiAgICB9LFxuICAgIERSQUdfREVGQVVMVF9FTkFCTEVfQ0xBU1M6ICdlbmFibGVDbGFzcycsXG4gICAgRklMRV9GSUxFRF9OQU1FOiAndXNlcmZpbGVbXScsXG4gICAgRk9MREVSX0lORk86ICdmb2xkZXJOYW1lJ1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IEh0bWxzXG4gKiBAdHlwZSB7e2lucHV0OiBzdHJpbmcsIGl0ZW06IHN0cmluZ319XG4gKi9cbm1vZHVsZS5leHBvcnRzLkhUTUwgPSB7XG4gICAgZm9ybTogWyc8Zm9ybSBlbmN0eXBlPVwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwiIGlkPVwiZm9ybURhdGFcIiBtZXRob2Q9XCJwb3N0XCI+JyxcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIk1BWF9GSUxFX1NJWkVcIiB2YWx1ZT1cIjMwMDAwMDBcIiAvPicsXG4gICAgICAgICc8L2Zvcm0+J10uam9pbignJyksXG4gICAgaW5wdXQ6IFsnPGlucHV0IHR5cGU9XCJmaWxlXCIgaWQ9XCJmaWxlQXR0YWNoXCIge3t3ZWJraXRkaXJlY3Rvcnl9fSBuYW1lPVwie3tmaWxlRmllbGR9fVwiIHt7bXVsdGlwbGV9fSAvPiddLmpvaW4oJycpLFxuICAgIHN1Ym1pdDogWyc8YnV0dG9uIGNsYXNzPVwiYmF0Y2hTdWJtaXRcIiB0eXBlPVwic3VibWl0XCI+U0VORDwvYnV0dG9uPiddLmpvaW4oJycpLFxuICAgIGl0ZW06IFsnPGxpIGNsYXNzPVwiZmlsZXR5cGVEaXNwbGF5Q2xhc3NcIj4nLFxuICAgICAgICAnPHNwbmEgY2xhc3M9XCJmaWxlaWNvbiB7e2ZpbGV0eXBlfX1cIj57e2ZpbGV0eXBlfX08L3NwbmE+JyxcbiAgICAgICAgJzxzcGFuIGNsYXNzPVwiZmlsZV9uYW1lXCI+e3tmaWxlbmFtZX19PC9zcGFuPicsXG4gICAgICAgICc8c3BhbiBjbGFzcz1cImZpbGVfc2l6ZVwiPnt7ZmlsZXNpemV9fTwvc3Bhbj4nLFxuICAgICAgICAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ7e2RlbGV0ZUJ1dHRvbkNsYXNzTmFtZX19XCI+RGVsZXRlPC9idXR0b24+JyxcbiAgICAgICAgJzwvbGk+J10uam9pbignJyksXG4gICAgZHJhZzogWyc8ZGl2IGNsYXNzPVwiZHJhZ3pvbmVcIj48L2Rpdj4nXS5qb2luKCcnKVxufTtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBGaWxlVXBsb2FkZXIgaXMgY29yZSBvZiBmaWxlIHVwbG9hZGVyIGNvbXBvbmVudC48YnI+RmlsZU1hbmFnZXIgbWFuYWdlIGNvbm5lY3RvciB0byBjb25uZWN0IHNlcnZlciBhbmQgdXBkYXRlIEZpbGVMaXN0Vmlldy5cbiAqIEBkZXBlbmRlbmN5IG5lLWNvZGUtc25pcHBldCAxLjAuMywganF1ZXJ5MS44LjNcbiAqIEBhdXRob3IgTkhOIEVudC4gRkUgRGV2ZWxvcG1lbnQgVGVhbSA8ZGxfamF2YXNjcmlwdEBuaG5lbnQuY29tPlxuICovXG4ndXNlIHN0cmljdCc7XG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi9jb25zdHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBjb25uID0gcmVxdWlyZSgnLi9jb25uZWN0b3IvY29ubmVjdG9yJyk7XG52YXIgSW5wdXQgPSByZXF1aXJlKCcuL3ZpZXcvaW5wdXQnKTtcbnZhciBMaXN0ID0gcmVxdWlyZSgnLi92aWV3L2xpc3QnKTtcbnZhciBQb29sID0gcmVxdWlyZSgnLi92aWV3L3Bvb2wnKTtcbnZhciBEcmFnQW5kRHJvcCA9IHJlcXVpcmUoJy4vdmlldy9kcmFnJyk7XG5cbi8qKlxuICogRmlsZVVwbG9hZGVyIGFjdCBsaWtlIGJyaWRnZSBiZXR3ZWVuIGNvbm5lY3RvciBhbmQgdmlldy5cbiAqIEl0IG1ha2VzIGNvbm5lY3RvciBhbmQgdmlldyB3aXRoIG9wdGlvbiBhbmQgZW52aXJvbm1lbnQuXG4gKiBJdCBjb250cm9sIGFuZCBtYWtlIGNvbm5lY3Rpb24gYW1vbmcgbW9kdWxlcy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgVGhlIG9wdGlvbnMgdG8gc2V0IHVwIGZpbGUgdXBsb2FkZXIgbW9kdWxlcy5cbiAqICBAcGFyYW0ge29iamVjdH0gb3B0aW9ucy51cmwgVGhlIHVybCBpcyBmaWxlIHNlcnZlci5cbiAqICAgICAgQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMudXJsLnNlbmQgVGhlIHVybCBpcyBmb3IgZmlsZSBhdHRhY2guXG4gKiAgICAgIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnVybC5yZW1vdmUgVGhlIHVybCBpcyBmb3IgZmlsZSBkZXRhY2guXG4gKiAgQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMuaGVscGVyIFRoZSBoZWxwZXIgb2JqZWN0IGluZm8gaXMgZm9yIHgtZG9tYWluLlxuICogICAgICBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5oZWxwZXIudXJsIFRoZSB1cmwgaXMgaGVscGVyIHBhZ2UgdXJsLlxuICogICAgICBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5oZWxwZXIubmFtZSBUaGUgbmFtZSBvZiBoaWRkZW4gZWxlbWVudCBmb3Igc2VuZGluZyBzZXJ2ZXIgaGVscGVyIHBhZ2UgaW5mb3JtYXRpb24uXG4gKiAgQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMucmVzdWx0VHlwZUVsZW1lbnROYW1lIFRoZSB0eXBlIG9mIGhpZGRlbiBlbGVtZW50IGZvciBzZW5kaW5nIHNlcnZlciByZXNwb25zZSB0eXBlIGluZm9ybWF0aW9uLlxuICogIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLmZvcm1UYXJnZXQgVGhlIHRhcmdldCBmb3IgeC1kb21haW4ganNvbnAgY2FzZS5cbiAqICBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5jYWxsYmFja05hbWUgVGhlIG5hbWUgb2YganNvbnAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKiAgQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMubGlzdEluZm8gVGhlIGVsZW1lbnQgaW5mbyB0byBkaXNwbGF5IGZpbGUgbGlzdCBpbmZvcm1hdGlvbi5cbiAqICBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5zZXBhcmF0b3IgVGhlIHNlcGFyYXRvciBmb3IganNvbnAgaGVscGVyIHJlc3BvbnNlLlxuICogIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5maWxlRmllbGQ9dXNlckZpbGVdIFRoZSBmaWVsZCBuYW1lIG9mIGlucHV0IGZpbGUgZWxlbWVudC5cbiAqICBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMudXNlRm9sZGVyIFdoZXRoZXIgc2VsZWN0IHVuaXQgaXMgZm9sZGVyIG9mIG5vdC4gSWYgdGhpcyBpcyB0dXJlLCBtdWx0aXBsZSB3aWxsIGJlIGlnbm9yZWQuXG4gKiAgQHBhcmFtIHtib29sZWFufSBvcHRpb25zLmlzTXVsdGlwbGUgV2hldGhlciBlbmFibGUgbXVsdGlwbGUgc2VsZWN0IG9yIG5vdC5cbiAqIEBwYXJhbSB7alF1ZXJ5fSAkZWwgUm9vdCBFbGVtZW50IG9mIFVwbG9hZGVyXG4gKiBAZXhhbXBsZVxuICogdmFyIHVwbG9hZGVyID0gbmV3IHR1aS5jb21wb25lbnQuVXBsb2FkZXIoe1xuICogICAgIHVybDoge1xuICogICAgICAgICBzZW5kOiBcImh0dHA6Ly9mZS5uaG5lbnQuY29tL2V0Yy9ldGMvdXBsb2FkZXIvdXBsb2FkZXIucGhwXCIsXG4gKiAgICAgICAgIHJlbW92ZTogXCJodHRwOi8vZmUubmhuZW50LmNvbS9ldGMvZXRjL3VwbG9hZGVyL3JlbW92ZS5waHBcIlxuICogICAgIH0sXG4gKiAgICAgaGVscGVyOiB7XG4gKiAgICAgICAgIHVybDogJ2h0dHA6Ly8xMC43Ny4zNC4xMjY6ODAwOS9zYW1wbGVzL3Jlc3BvbnNlLmh0bWwnLFxuICogICAgICAgICBuYW1lOiAnUkVESVJFQ1RfVVJMJ1xuICogICAgIH0sXG4gKiAgICAgcmVzdWx0VHlwZUVsZW1lbnROYW1lOiAnUkVTUE9OU0VfVFlQRScsXG4gKiAgICAgZm9ybVRhcmdldDogJ2hpZGRlbkZyYW1lJyxcbiAqICAgICBjYWxsYmFja05hbWU6ICdyZXNwb25zZUNhbGxiYWNrJyxcbiAqICAgICBsaXN0SW5mbzoge1xuICogICAgICAgICBsaXN0OiAkKCcjZmlsZXMnKSxcbiAqICAgICAgICAgY291bnQ6ICQoJyNmaWxlX2NvdW50JyksXG4gKiAgICAgICAgIHNpemU6ICQoJyNzaXplX2NvdW50JylcbiAqICAgICB9LFxuICogICAgIHNlcGFyYXRvcjogJzsnXG4gKiB9LCAkKCcjdXBsb2FkZXInKSk7XG4gKi9cbnZhciBVcGxvYWRlciA9IHR1aS51dGlsLmRlZmluZUNsYXNzKC8qKkBsZW5kcyBVcGxvYWRlci5wcm90b3R5cGUgKi97XG4gICAgLyoqXG4gICAgICogaW5pdGlhbGl6ZVxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMsICRlbCkge1xuICAgICAgICB0aGlzLl9zZXREYXRhKG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9zZXRDb25uZWN0b3IoKTtcblxuICAgICAgICB0aGlzLiRlbCA9ICRlbDtcblxuICAgICAgICBpZih0aGlzLnVzZURyYWcgJiYgIXRoaXMudXNlRm9sZGVyICYmIHV0aWxzLmlzU3VwcG9ydEZpbGVTeXN0ZW0oKSkge1xuICAgICAgICAgICAgdGhpcy5kcmFnVmlldyA9IG5ldyBEcmFnQW5kRHJvcChvcHRpb25zLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaW5wdXRWaWV3ID0gbmV3IElucHV0KG9wdGlvbnMsIHRoaXMpO1xuICAgICAgICB0aGlzLmxpc3RWaWV3ID0gbmV3IExpc3Qob3B0aW9ucywgdGhpcyk7XG5cbiAgICAgICAgdGhpcy5maWxlRmllbGQgPSB0aGlzLmZpbGVGaWVsZCB8fCBjb25zdHMuQ09ORi5GSUxFX0ZJTEVEX05BTUU7XG4gICAgICAgIHRoaXMuX3Bvb2wgPSBuZXcgUG9vbCh0aGlzLmlucHV0Vmlldy4kZWxbMF0pO1xuICAgICAgICB0aGlzLl9hZGRFdmVudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgQ29ubmVjdG9yXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc2V0Q29ubmVjdG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNCYXRjaFRyYW5zZmVyKSB7XG4gICAgICAgICAgICB0aGlzLnR5cGUgPSAnbG9jYWwnO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNDcm9zc0RvbWFpbigpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oZWxwZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGUgPSAnanNvbnAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGVydChjb25zdHMuQ09ORi5FUlJPUi5OT1RfU1VSUFBPUlQpO1xuICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9ICdsb2NhbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy51c2VKc29ucCB8fCAhdXRpbHMuaXNTdXBwb3J0Rm9ybURhdGEoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9ICdqc29ucCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9ICdhamF4JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jb25uZWN0b3IgPSBjb25uLmdldENvbm5lY3Rvcih0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGxpc3QgdmlldyB3aXRoIGN1c3RvbSBvciBvcmlnaW5hbCBkYXRhLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbmZvIFRoZSBkYXRhIGZvciB1cGRhdGUgbGlzdFxuICAgICAqICBAcGFyYW0ge3N0cmluZ30gaW5mby5hY3Rpb24gVGhlIGFjdGlvbiBuYW1lIHRvIGV4ZWN1dGUgbWV0aG9kXG4gICAgICovXG4gICAgbm90aWZ5OiBmdW5jdGlvbihpbmZvKSB7XG4gICAgICAgIHRoaXMubGlzdFZpZXcudXBkYXRlKGluZm8pO1xuICAgICAgICB0aGlzLmxpc3RWaWV3LnVwZGF0ZVRvdGFsSW5mbyhpbmZvKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGZpZWxkIGRhdGEgYnkgb3B0aW9uIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3NldERhdGE6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdHVpLnV0aWwuZXh0ZW5kKHRoaXMsIG9wdGlvbnMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IHByb3RvY29sICsgZG9tYWluIGZyb20gdXJsIHRvIGZpbmQgb3V0IHdoZXRoZXIgY3Jvc3MtZG9tYWluIG9yIG5vdC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0Nyb3NzRG9tYWluOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBhZ2VEb21haW4gPSBkb2N1bWVudC5kb21haW47XG4gICAgICAgIHJldHVybiB0aGlzLnVybC5zZW5kLmluZGV4T2YocGFnZURvbWFpbikgPT09IC0xO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgZXJyb3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgRXJyb3IgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBlcnJvckNhbGxiYWNrOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICB2YXIgbWVzc2FnZTtcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1zZykge1xuICAgICAgICAgICAgbWVzc2FnZSA9IHJlc3BvbnNlLm1zZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBjb25zdHMuQ09ORi5FUlJPUi5ERUZBVUxUO1xuICAgICAgICB9XG4gICAgICAgIGFsZXJ0KG1lc3NhZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3IgY3VzdG9tIHNlbmQgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2RhdGFdIFRoZSBkYXRhIGluY2x1ZGUgY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGZpbGUgY2xvbmVcbiAgICAgKi9cbiAgICBzZW5kRmlsZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0dWkudXRpbC5iaW5kKHRoaXMubm90aWZ5LCB0aGlzKSxcbiAgICAgICAgICAgIGZpbGVzID0gZGF0YSAmJiBkYXRhLmZpbGVzO1xuXG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rvci5hZGRSZXF1ZXN0KHtcbiAgICAgICAgICAgIHR5cGU6ICdhZGQnLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IHRoaXMuZXJyb3JDYWxsYmFja1xuICAgICAgICB9LCBmaWxlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciBjdXN0b20gcmVtb3ZlIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgVGhlIGRhdGEgZm9yIHJlbW92ZSBmaWxlLlxuICAgICAqL1xuICAgIHJlbW92ZUZpbGU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdHVpLnV0aWwuYmluZCh0aGlzLm5vdGlmeSwgdGhpcyk7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rvci5yZW1vdmVSZXF1ZXN0KHtcbiAgICAgICAgICAgIHR5cGU6ICdyZW1vdmUnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJtaXQgZm9yIGRhdGEgc3VibWl0IHRvIHNlcnZlclxuICAgICAqIEBhcGlcbiAgICAgKi9cbiAgICBzdWJtaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fY29ubmVjdG9yLnN1Ym1pdCkge1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlzU3VwcG9ydEZvcm1EYXRhKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb25uZWN0b3Iuc3VibWl0KHR1aS51dGlsLmJpbmQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBAYXBpXG4gICAgICAgICAgICAgICAgICAgICAqIEBldmVudCBVcGxvYWRlciNiYXRjaFN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgICogQHBhcmFtIHtVcGxvYWRlcn0gdXBsb2FkZXIgLSB1cGxvYWRlciBpbnN0YW5jZVxuICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maXJlKCdiYXRjaFN1Y2Nlc3MnLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvb2wucGxhbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsZSBpbmZvIGxvY2FsbHlcbiAgICAgKiBAcGFyYW0ge0h0bWxFbGVtZW50fSBlbGVtZW50IElucHV0IGVsZW1lbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRGaWxlSW5mbzogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICB2YXIgZmlsZXM7XG4gICAgICAgIGlmICh1dGlscy5pc1N1cHBvcnRGaWxlU3lzdGVtKCkpIHtcbiAgICAgICAgICAgIGZpbGVzID0gdGhpcy5fZ2V0RmlsZUxpc3QoZWxlbWVudC5maWxlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWxlcyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBlbGVtZW50LnZhbHVlLFxuICAgICAgICAgICAgICAgIGlkOiBlbGVtZW50LnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWxlcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGZpbGUgbGlzdCBmcm9tIEZpbGVMaXN0IG9iamVjdFxuICAgICAqIEBwYXJhbSB7RmlsZUxpc3R9IGZpbGVzIEEgRmlsZUxpc3Qgb2JqZWN0XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldEZpbGVMaXN0OiBmdW5jdGlvbihmaWxlcykge1xuICAgICAgICByZXR1cm4gdHVpLnV0aWwubWFwKGZpbGVzLCBmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZSxcbiAgICAgICAgICAgICAgICBzaXplOiBmaWxlLnNpemUsXG4gICAgICAgICAgICAgICAgaWQ6IGZpbGUubmFtZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBldmVudCB0byBsaXN0dmlldyBhbmQgaW5wdXR2aWV3XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYWRkRXZlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgaWYodGhpcy51c2VEcmFnICYmIHRoaXMuZHJhZ1ZpZXcpIHtcbiAgICAgICAgICAgIC8vIEB0b2RvIHRvcCDsspjrpqzqsIAg65Sw66GcIO2VhOyalO2VqCwgc2VuZEZpbGUg7IKs7JqpIOyViOuQqFxuICAgICAgICAgICAgdGhpcy5kcmFnVmlldy5vbignZHJvcCcsIHRoaXMuc2VuZEZpbGUsIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmlzQmF0Y2hUcmFuc2Zlcikge1xuICAgICAgICAgICAgdGhpcy5pbnB1dFZpZXcub24oJ3NhdmUnLCB0aGlzLnNlbmRGaWxlLCB0aGlzKTtcbiAgICAgICAgICAgIHRoaXMubGlzdFZpZXcub24oJ3JlbW92ZScsIHRoaXMucmVtb3ZlRmlsZSwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlucHV0Vmlldy5vbignY2hhbmdlJywgdGhpcy5zZW5kRmlsZSwgdGhpcyk7XG4gICAgICAgICAgICB0aGlzLmxpc3RWaWV3Lm9uKCdyZW1vdmUnLCB0aGlzLnJlbW92ZUZpbGUsIHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEN1c3RvbSBFdmVudHNcbiAgICAgICAgICogQGFwaVxuICAgICAgICAgKiBAZXZlbnQgVXBsb2FkZXIjZmlsZUFkZGVkXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgLSBUYXJnZXQgaXRlbSBpbmZvcm1hdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5saXN0Vmlldy5vbignZmlsZUFkZGVkJywgZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgICAgICAgICBzZWxmLmZpcmUoJ2ZpbGVBZGRlZCcsIHRhcmdldCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDdXN0b20gRXZlbnRzXG4gICAgICAgICAqIEBhcGlcbiAgICAgICAgICogQGV2ZW50IFVwbG9hZGVyI2ZpbGVSZW1vdmVkXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBuYW1lIC0gVGhlIGZpbGUgbmFtZSB0byByZW1vdmVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubGlzdFZpZXcub24oJ2ZpbGVSZW1vdmVkJywgZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgc2VsZi5maXJlKCdmaWxlUmVtb3ZlZCcsIG5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgaW5wdXQgZWxlbWVudCB0byBwb29sLlxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGlucHV0IEEgaW5wdXQgZWxlbWVudFt0eXBlPWZpbGVdIGZvciBzdG9yZSBwb29sXG4gICAgICovXG4gICAgc3RvcmU6IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICAgIHRoaXMuX3Bvb2wuc3RvcmUoaW5wdXQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgaW5wdXQgZWxlbWVudCBmb3JtIHBvb2wuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIGZpbGUgbmFtZSB0byByZW1vdmVcbiAgICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgaWYgKCF1dGlscy5pc1N1cHBvcnRGb3JtRGF0YSgpKSB7XG4gICAgICAgICAgICB0aGlzLl9wb29sLnJlbW92ZShuYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG50dWkudXRpbC5DdXN0b21FdmVudHMubWl4aW4oVXBsb2FkZXIpO1xubW9kdWxlLmV4cG9ydHMgPSBVcGxvYWRlcjtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBUaGlzIGZpbGUgY29udGFpbiB1dGlsaXR5IG1ldGhvZHMgZm9yIHVwbG9hZGVyLlxuICogQGF1dGhvciBOSE4gRW50LiBGRSBEZXZlbG9wbWVudCBUZWFtIDxkbF9qYXZhc2NyaXB0QG5obmVudC5jb20+XG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuLyoqXG4gKiBAbmFtZXNwYWNlIHV0aWxzXG4gKi9cbi8qKlxuICogRXh0cmFjdCB1bml0IGZvciBmaWxlIHNpemVcbiAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyBBIHVzYWdlIG9mIGZpbGVcbiAqIEBtZW1iZXJvZiB1dGlsc1xuICovXG52YXIgZ2V0RmlsZVNpemVXaXRoVW5pdCA9IGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgdmFyIHVuaXRzID0gWydCJywgJ0tCJywgJ01CJywgJ0dCJywgJ1RCJ10sXG4gICAgICAgIGJ5dGVzID0gcGFyc2VJbnQoYnl0ZXMsIDEwKSxcbiAgICAgICAgZXhwID0gTWF0aC5sb2coYnl0ZXMpIC8gTWF0aC5sb2coMTAyNCkgfCAwLFxuICAgICAgICByZXN1bHQgPSAoYnl0ZXMgLyBNYXRoLnBvdygxMDI0LCBleHApKS50b0ZpeGVkKDIpO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHVuaXRzW2V4cF07XG59O1xuXG4vKipcbiAqIFdoZXRoZXIgdGhlIGJyb3dzZXIgc3VwcG9ydCBGb3JtRGF0YSBvciBub3RcbiAqIEBtZW1iZXJvZiB1dGlsc1xuICovXG52YXIgaXNTdXBwb3J0Rm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgRm9ybURhdGEgPSAod2luZG93LkZvcm1EYXRhIHx8IG51bGwpO1xuICAgIHJldHVybiAhIUZvcm1EYXRhO1xufTtcblxuLyoqXG4gKiBHZXQgaXRlbSBlbGVtZW50cyBIVE1MXG4gKiBAcGFyYW0ge3N0cmluZ30gaHRtbCBIVE1MIHRlbXBsYXRlXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICogQG1lbWJlcm9mIHV0aWxzXG4gKi9cbnZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKG1hcCwgaHRtbCkge1xuICAgIGh0bWwgPSBodG1sLnJlcGxhY2UoL1xce1xceyhbXlxcfV0rKVxcfVxcfS9nLCBmdW5jdGlvbihtc3RyLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBtYXBbbmFtZV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGh0bWw7XG59O1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgc3VwcG9ydCBmaWxlIGFwaSBvciBub3RcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogQG1lbWJlcm9mIHV0aWxzXG4gKi9cbnZhciBpc1N1cHBvcnRGaWxlU3lzdGVtID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICEhKHdpbmRvdy5GaWxlICYmIHdpbmRvdy5GaWxlUmVhZGVyICYmIHdpbmRvdy5GaWxlTGlzdCAmJiB3aW5kb3cuQmxvYik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRGaWxlU2l6ZVdpdGhVbml0OiBnZXRGaWxlU2l6ZVdpdGhVbml0LFxuICAgIGlzU3VwcG9ydEZpbGVTeXN0ZW06IGlzU3VwcG9ydEZpbGVTeXN0ZW0sXG4gICAgaXNTdXBwb3J0Rm9ybURhdGE6IGlzU3VwcG9ydEZvcm1EYXRhLFxuICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVxufTtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBUaGlzIGZpbGUgaXMgYWJvdXQgZHJhZyBhbmQgZHJvcCBmaWxlIHRvIHNlbmQuIERyYWcgYW5kIGRyb3AgaXMgcnVubmluZyB2aWEgZmlsZSBhcGkuXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIERldmVsb3BtZW50IFRlYW0gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBNYWtlcyBkcmFnIGFuZCBkcm9wIGFyZWEsIHRoZSBkcm9wcGVkIGZpbGUgaXMgYWRkZWQgdmlhIGV2ZW50IGRyb3AgZXZlbnQuXG4gKiBAY2xhc3MgVmlldy5EcmFnQW5kRHJvcFxuICovXG52YXIgRHJhZ0FuZERyb3AgPSB0dWkudXRpbC5kZWZpbmVDbGFzcygvKiogQGxlbmRzIFZpZXcuRHJhZ0FuZERyb3AucHJvdG90eXBlICove1xuICAgIC8qKlxuICAgICAqIGluaXRpYWxpemUgRHJhZ0FuZERyb3BcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zLCB1cGxvYWRlcikge1xuICAgICAgICB2YXIgaHRtbCA9IG9wdGlvbnMudGVtcGxhdGUgJiYgb3B0aW9ucy50ZW1wbGF0ZS5kcmFnIHx8IGNvbnN0cy5IVE1MLmRyYWc7XG4gICAgICAgIHRoaXMuX2VuYWJsZUNsYXNzID0gb3B0aW9ucy5kcmFnICYmIG9wdGlvbnMuZHJhZy5lbmFibGVDbGFzcyB8fCBjb25zdHMuQ09ORi5EUkFHX0RFRkFVTFRfRU5BQkxFX0NMQVNTO1xuICAgICAgICB0aGlzLl9yZW5kZXIoaHRtbCwgdXBsb2FkZXIpO1xuICAgICAgICB0aGlzLl9hZGRFdmVudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXJzIGRyYWcgYW5kIGRyb3AgYXJlYVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sIFRoZSBodG1sIHN0cmluZyB0byBtYWtlIGRhcmcgem9uZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB1cGxvYWRlciBUaGUgY29yZSBpbnN0YW5jZSBvZiB0aGlzIGNvbXBvbmVudFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlbmRlcjogZnVuY3Rpb24oaHRtbCwgdXBsb2FkZXIpIHtcbiAgICAgICAgdGhpcy4kZWwgPSAkKGh0bWwpO1xuICAgICAgICB1cGxvYWRlci4kZWwuYXBwZW5kKHRoaXMuJGVsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBkcmFnIGFuZCBkcm9wIGV2ZW50XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYWRkRXZlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5vbignZHJhZ2VudGVyJywgdHVpLnV0aWwuYmluZCh0aGlzLm9uRHJhZ0VudGVyLCB0aGlzKSk7XG4gICAgICAgIHRoaXMuJGVsLm9uKCdkcmFnb3ZlcicsIHR1aS51dGlsLmJpbmQodGhpcy5vbkRyYWdPdmVyLCB0aGlzKSk7XG4gICAgICAgIHRoaXMuJGVsLm9uKCdkcm9wJywgdHVpLnV0aWwuYmluZCh0aGlzLm9uRHJvcCwgdGhpcykpO1xuICAgICAgICB0aGlzLiRlbC5vbignZHJhZ2xlYXZlJywgdHVpLnV0aWwuYmluZCh0aGlzLm9uRHJhZ0xlYXZlLCB0aGlzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgZHJhZ2VudGVyIGV2ZW50XG4gICAgICovXG4gICAgb25EcmFnRW50ZXI6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB0aGlzLl9lbmFibGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBkcmFnb3ZlciBldmVudFxuICAgICAqL1xuICAgIG9uRHJhZ092ZXI6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGRyYWdsZWF2ZSBldmVudFxuICAgICAqL1xuICAgIG9uRHJhZ0xlYXZlOiBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdGhpcy5fZGlzYWJsZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGRyb3AgZXZlbnRcbiAgICAgKi9cbiAgICBvbkRyb3A6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLl9kaXNhYmxlKCk7XG4gICAgICAgIHRoaXMuZmlyZSgnZHJvcCcsIHtcbiAgICAgICAgICAgIGZpbGVzOiBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIF9lbmFibGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcyh0aGlzLl9lbmFibGVDbGFzcyk7XG4gICAgfSxcblxuICAgIF9kaXNhYmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3ModGhpcy5fZW5hYmxlQ2xhc3MpO1xuICAgIH1cbn0pO1xuXG50dWkudXRpbC5DdXN0b21FdmVudHMubWl4aW4oRHJhZ0FuZERyb3ApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERyYWdBbmREcm9wO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IElucHV0VmlldyBtYWtlIGlucHV0IGZvcm0gYnkgdGVtcGxhdGUuIEFkZCBldmVudCBmaWxlIHVwbG9hZCBldmVudC5cbiAqIEBkZXBlbmRlbmN5IG5lLWNvZGUtc25pcHBldCAxLjAuMywganF1ZXJ5MS44LjNcbiAqIEBhdXRob3IgTkhOIEVudC4gRkUgRGV2ZWxvcG1lbnQgVGVhbSA8ZGxfamF2YXNjcmlwdEBuaG5lbnQuY29tPlxuICovXG4ndXNlIHN0cmljdCc7XG52YXIgY29uc3RzID0gcmVxdWlyZSgnLi4vY29uc3RzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG4vKipcbiAqIFRoaXMgdmlldyBjb250cm9sIGlucHV0IGVsZW1lbnQgdHlwZWQgZmlsZS5cbiAqIEBjb25zdHJ1Y3RvciBWaWV3LklucHV0Vmlld1xuICovXG52YXIgSW5wdXQgPSB0dWkudXRpbC5kZWZpbmVDbGFzcygvKipAbGVuZHMgVmlldy5JbnB1dC5wcm90b3R5cGUgKiove1xuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucywgdXBsb2FkZXIpIHtcblxuICAgICAgICB0aGlzLl91cGxvYWRlciA9IHVwbG9hZGVyO1xuICAgICAgICB0aGlzLl90YXJnZXQgPSBvcHRpb25zLmZvcm1UYXJnZXQ7XG4gICAgICAgIHRoaXMuX3VybCA9IG9wdGlvbnMudXJsO1xuICAgICAgICB0aGlzLl9pc0JhdGNoVHJhbnNmZXIgPSBvcHRpb25zLmlzQmF0Y2hUcmFuc2ZlcjtcbiAgICAgICAgdGhpcy5faXNNdWx0aXBsZSA9ICEhKHV0aWxzLmlzU3VwcG9ydEZvcm1EYXRhKCkgJiYgb3B0aW9ucy5pc011bHRpcGxlKTtcbiAgICAgICAgdGhpcy5fdXNlRm9sZGVyID0gISEodXRpbHMuaXNTdXBwb3J0Rm9ybURhdGEoKSAmJiBvcHRpb25zLnVzZUZvbGRlcik7XG5cbiAgICAgICAgdGhpcy5faHRtbCA9IHRoaXMuX3NldEhUTUwob3B0aW9ucy50ZW1wbGF0ZSk7XG5cbiAgICAgICAgdGhpcy5fcmVuZGVyKCk7XG4gICAgICAgIHRoaXMuX3JlbmRlckhpZGRlbkVsZW1lbnRzKCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuaGVscGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9tYWtlQnJpZGdlSW5mb0VsZW1lbnQob3B0aW9ucy5oZWxwZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYWRkRXZlbnQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGlucHV0IGFyZWFcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbCA9ICQodGhpcy5fZ2V0SHRtbCgpKTtcbiAgICAgICAgdGhpcy4kZWwuYXR0cih7XG4gICAgICAgICAgICBhY3Rpb246IHRoaXMuX3VybC5zZW5kLFxuICAgICAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgICAgICBlbmN0eXBlOiBcIm11bHRpcGFydC9mb3JtLWRhdGFcIixcbiAgICAgICAgICAgIHRhcmdldDogKCF0aGlzLl9pc0JhdGNoVHJhbnNmZXIgPyB0aGlzLl90YXJnZXQgOiAnJylcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuJGlucHV0ID0gdGhpcy5fZ2V0SW5wdXRFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuJHN1Ym1pdCA9IHRoaXMuX2dldFN1Ym1pdEVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy4kaW5wdXQuYXBwZW5kVG8odGhpcy4kZWwpO1xuICAgICAgICBpZiAodGhpcy4kc3VibWl0KSB7XG4gICAgICAgICAgICB0aGlzLiRzdWJtaXQuYXBwZW5kVG8odGhpcy4kZWwpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3VwbG9hZGVyLiRlbC5hcHBlbmQodGhpcy4kZWwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYWxsIG9mIGlucHV0IGVsZW1lbnRzIGh0bWwgc3RyaW5ncy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW3RlbXBsYXRlXSBUaGUgdGVtcGxhdGUgaXMgc2V0IGZvcm0gY3VzdG9tZXIuXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBUaGUgaHRtbCBzdHJpbmcgc2V0IGZvciBpbnB1dFZpZXdcbiAgICAgKi9cbiAgICBfc2V0SFRNTDogZnVuY3Rpb24odGVtcGxhdGUpIHtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbnB1dDogdGVtcGxhdGUuaW5wdXQgfHwgY29uc3RzLkhUTUwuaW5wdXQsXG4gICAgICAgICAgICBzdWJtaXQ6IHRlbXBsYXRlLnN1Ym1pdCB8fCBjb25zdHMuSFRNTC5zdWJtaXQsXG4gICAgICAgICAgICBmb3JtOiB0ZW1wbGF0ZS5mb3JtIHx8IGNvbnN0cy5IVE1MLmZvcm1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogR2V0IGh0bWwgc3RyaW5nIGZyb20gdGVtcGxhdGVcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0SHRtbDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9odG1sLmZvcm07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1ha2VzIGFuZCByZXR1cm5zIGpxdWVyeSBlbGVtZW50XG4gICAgICogQHJldHVybiB7b2JqZWN0fSBUaGUganF1ZXJ5IG9iamVjdCB3cmFwcGluZyBvcmlnaW5hbCBpbnB1dCBlbGVtZW50XG4gICAgICovXG4gICAgX2dldElucHV0RWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtYXAgPSB7XG4gICAgICAgICAgICBtdWx0aXBsZTogdGhpcy5faXNNdWx0aXBsZSA/ICdtdWx0aXBsZScgOiAnJyxcbiAgICAgICAgICAgIGZpbGVGaWVsZDogdGhpcy5fdXBsb2FkZXIuZmlsZUZpZWxkLFxuICAgICAgICAgICAgd2Via2l0ZGlyZWN0b3J5OiB0aGlzLl91c2VGb2xkZXIgPyAnd2Via2l0ZGlyZWN0b3J5JyA6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuICQodXRpbHMudGVtcGxhdGUobWFwLCB0aGlzLl9odG1sLmlucHV0KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1ha2VzIGFuZCByZXR1cm5zIGpxdWVyeSBlbGVtZW50XG4gICAgICogQHJldHVybiB7b2JqZWN0fSBUaGUganF1ZXJ5IG9iamVjdCB3cmFwcGluZyBzdW1iaXQgYnV0dG9uIGVsZW1lbnRcbiAgICAgKi9cbiAgICBfZ2V0U3VibWl0RWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0JhdGNoVHJhbnNmZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMuX2h0bWwuc3VibWl0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsIG1ldGhvZHMgdGhvc2UgbWFrZSBlYWNoIGhpZGRlbiBlbGVtZW50LlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlbmRlckhpZGRlbkVsZW1lbnRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fbWFrZVRhcmdldEZyYW1lKCk7XG4gICAgICAgIHRoaXMuX21ha2VSZXN1bHRUeXBlRWxlbWVudCgpO1xuICAgICAgICB0aGlzLl9tYWtlQ2FsbGJhY2tFbGVtZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBldmVudFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2FkZEV2ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQmF0Y2hUcmFuc2Zlcikge1xuICAgICAgICAgICAgaWYgKHV0aWxzLmlzU3VwcG9ydEZvcm1EYXRhKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5vbignc3VibWl0JywgdHVpLnV0aWwuYmluZChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdXBsb2FkZXIuc3VibWl0KCk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcykpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5vbignc3VibWl0JywgdHVpLnV0aWwuYmluZChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3VwbG9hZGVyLnN1Ym1pdCgpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9hZGRJbnB1dEV2ZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBpbnB1dCBlbGVtZW50IGNoYW5nZSBldmVudCBieSBzZW5kaW5nIHR5cGVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hZGRJbnB1dEV2ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQmF0Y2hUcmFuc2Zlcikge1xuICAgICAgICAgICAgdGhpcy4kaW5wdXQub24oJ2NoYW5nZScsIHR1aS51dGlsLmJpbmQodGhpcy5vblNhdmUsIHRoaXMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJGlucHV0Lm9uKCdjaGFuZ2UnLCB0dWkudXRpbC5iaW5kKHRoaXMub25DaGFuZ2UsIHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudC1IYW5kbGUgZm9yIGlucHV0IGVsZW1lbnQgY2hhbmdlXG4gICAgICovXG4gICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIXRoaXMuJGlucHV0WzBdLnZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXJlKCdjaGFuZ2UnLCB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRoaXNcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50LUhhbmRsZSBmb3Igc2F2ZSBpbnB1dCBlbGVtZW50XG4gICAgICovXG4gICAgb25TYXZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRpbnB1dFswXS52YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzYXZlQ2FsbGJhY2sgPSAhdXRpbHMuaXNTdXBwb3J0Rm9ybURhdGEoKSA/IHR1aS51dGlsLmJpbmQodGhpcy5fcmVzZXRJbnB1dEVsZW1lbnQsIHRoaXMpIDogbnVsbDtcbiAgICAgICAgdGhpcy5maXJlKCdzYXZlJywge1xuICAgICAgICAgICAgZWxlbWVudDogdGhpcy4kaW5wdXRbMF0sXG4gICAgICAgICAgICBjYWxsYmFjazogc2F2ZUNhbGxiYWNrXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBJbnB1dCBlbGVtZW50IHRvIHNhdmUgd2hvbGUgaW5wdXQ9ZmlsZSBlbGVtZW50LlxuICAgICAqL1xuICAgIF9yZXNldElucHV0RWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGlucHV0Lm9mZigpO1xuICAgICAgICB0aGlzLl9jbG9uZSh0aGlzLiRpbnB1dFswXSk7XG4gICAgICAgIHRoaXMuJGlucHV0ID0gdGhpcy5fZ2V0SW5wdXRFbGVtZW50KCk7XG4gICAgICAgIGlmICh0aGlzLiRzdWJtaXQpIHtcbiAgICAgICAgICAgIHRoaXMuJHN1Ym1pdC5iZWZvcmUodGhpcy4kaW5wdXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKHRoaXMuJGlucHV0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9hZGRJbnB1dEV2ZW50KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1ha2VzIGVsZW1lbnQgdG8gYmUgdGFyZ2V0IG9mIHN1Ym1pdCBmb3JtIGVsZW1lbnQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfbWFrZVRhcmdldEZyYW1lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fJHRhcmdldCA9ICQoJzxpZnJhbWUgbmFtZT1cIicgKyB0aGlzLl90YXJnZXQgKyAnXCI+PC9pZnJhbWU+Jyk7XG4gICAgICAgIHRoaXMuXyR0YXJnZXQuY3NzKHtcbiAgICAgICAgICAgIHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuICAgICAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZSdcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VwbG9hZGVyLiRlbC5hcHBlbmQodGhpcy5fJHRhcmdldCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1ha2UgZWxlbWVudCB0byBiZSBjYWxsYmFjayBmdW5jdGlvbiBuYW1lXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfbWFrZUNhbGxiYWNrRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuXyRjYWxsYmFjayA9IHRoaXMuX21ha2VIaWRkZW5FbGVtZW50KHtcbiAgICAgICAgICAgICduYW1lJzogY29uc3RzLkNPTkYuSlNPTlBDQUxMQkFDS19OQU1FLFxuICAgICAgICAgICAgJ3ZhbHVlJzogdGhpcy5fdXBsb2FkZXIuY2FsbGJhY2tOYW1lXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLiRlbC5hcHBlbmQodGhpcy5fJGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTWFrZXMgZWxlbWVudCB0byBrbm93IHdoaWNoIHR5cGUgcmVxdWVzdFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX21ha2VSZXN1bHRUeXBlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuXyRyZXNUeXBlID0gdGhpcy5fbWFrZUhpZGRlbkVsZW1lbnQoe1xuICAgICAgICAgICAgJ25hbWUnIDogdGhpcy5fdXBsb2FkZXIucmVzdWx0VHlwZUVsZW1lbnROYW1lIHx8IGNvbnN0cy5DT05GLlJFU1BPTlNFX1RZUEUsXG4gICAgICAgICAgICAndmFsdWUnOiB0aGlzLl91cGxvYWRlci50eXBlXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLiRlbC5hcHBlbmQodGhpcy5fJHJlc1R5cGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNYWtlIGVsZW1lbnQgdGhhdCBoYXMgcmVkaXJlY3QgcGFnZSBpbmZvcm1hdGlvbiB1c2VkIGJ5IFNlcnZlciBzaWRlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBoZWxwZXIgUmVkaXJlY3Rpb24gaW5mb3JtYXRpb24gZm9yIGNsZWFyIHgtZG9tYWluIHByb2JsZW0uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfbWFrZUJyaWRnZUluZm9FbGVtZW50OiBmdW5jdGlvbihoZWxwZXIpIHtcbiAgICAgICAgdGhpcy5fJGhlbHBlciA9IHRoaXMuX21ha2VIaWRkZW5FbGVtZW50KHtcbiAgICAgICAgICAgICduYW1lJyA6IGhlbHBlci5uYW1lIHx8IGNvbnN0cy5DT05GLlJFRElSRUNUX1VSTCxcbiAgICAgICAgICAgICd2YWx1ZSc6IGhlbHBlci51cmxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuJGVsLmFwcGVuZCh0aGlzLl8kaGVscGVyKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTWFrZSBoaWRkZW4gaW5wdXQgZWxlbWVudCB3aXRoIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBUaGUgb3BpdG9ucyB0byBiZSBhdHRyaWJ1dGUgb2YgaW5wdXRcbiAgICAgKiBAcmV0dXJucyB7KnxqUXVlcnl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfbWFrZUhpZGRlbkVsZW1lbnQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdHVpLnV0aWwuZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgICAgIHR5cGU6ICdoaWRkZW4nXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gJCgnPGlucHV0IC8+JykuYXR0cihvcHRpb25zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXNrIHVwbG9hZGVyIHRvIHNhdmUgaW5wdXQgZWxlbWVudCB0byBwb29sXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gaW5wdXQgQSBpbnB1dCBlbGVtZW50W3R5cGU9ZmlsZV0gZm9yIHN0b3JlIHBvb2xcbiAgICAgKi9cbiAgICBfY2xvbmU6IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICAgIGlucHV0LmZpbGVfbmFtZSA9IGlucHV0LnZhbHVlO1xuICAgICAgICB0aGlzLl91cGxvYWRlci5zdG9yZShpbnB1dCk7XG4gICAgfVxuXG59KTtcblxudHVpLnV0aWwuQ3VzdG9tRXZlbnRzLm1peGluKElucHV0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dDtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBJdGVtVmlldyBtYWtlIGVsZW1lbnQgdG8gZGlzcGxheSBhZGRlZCBmaWxlIGluZm9ybWF0aW9uLiBJdCBoYXMgYXR0YWNoZWQgZmlsZSBJRCB0byByZXF1ZXN0IGZvciByZW1vdmUuXG4gKiBAZGVwZW5kZW5jeSBuZS1jb2RlLXNuaXBwZXQgMS4wLjMsIGpxdWVyeTEuOC4zXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIERldmVsb3BtZW50IFRlYW0gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIGNvbnN0cyA9IHJlcXVpcmUoJy4uL2NvbnN0cycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBDbGFzcyBvZiBpdGVtIHRoYXQgaXMgbWVtYmVyIG9mIGZpbGUgbGlzdC5cbiAqIEBjbGFzcyBWaWV3Lkl0ZW1cbiAqL1xudmFyIEl0ZW0gPSB0dWkudXRpbC5kZWZpbmVDbGFzcygvKiogQGxlbmRzIFZpZXcuSXRlbS5wcm90b3R5cGUgKiovIHtcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGl0ZW1cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAgICAqICBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5uYW1lIEZpbGUgbmFtZVxuICAgICAqICBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy50eXBlIEZpbGUgdHlwZVxuICAgICAqICBAcGFyYW0ge29iamVjdH0gb3B0aW9ucy5yb290IExpc3Qgb2JqZWN0XG4gICAgICogIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLmhpZGRlbkZyYW1lIFRoZSBpZnJhbWUgbmFtZSB3aWxsIGJlIHRhcmdldCBvZiBmb3JtIHN1Ym1pdC5cbiAgICAgKiAgQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMudXJsIFRoZSB1cmwgZm9yIGZvcm0gYWN0aW9uIHRvIHN1Ym1ldC5cbiAgICAgKiAgQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmlkXSBVbmlxdWUga2V5LCB3aGF0IGlmIHRoZSBrZXkgaXMgbm90IGV4aXN0IGlkIHdpbGwgYmUgdGhlIGZpbGUgbmFtZS5cbiAgICAgKiAgQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmhpZGRlbkZpZWxkTmFtZV0gVGhlIG5hbWUgb2YgaGlkZGVuIGZpbGVkLiBUaGUgaGlkZGVuIGZpZWxkIGlzIGZvciBjb25uZWN0aW5nIHgtZG9taWFuLlxuICAgICAqICBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuZGVsZXRlQnV0dG9uQ2xhc3NOYW1lPSd1cGxvYWRlcl9idG5fZGVsZXRlJ10gVGhlIGNsYXNzIG5hbWUgaXMgZm9yIGRlbGV0ZSBidXR0b24uXG4gICAgICogIEBwYXJhbSB7KHN0cmluZ3xudW1iZXIpfSBbb3B0aW9ucy5zaXplXSBGaWxlIHNpemUgKGJ1dCBpZSBsb3cgYnJvd3NlciwgeC1kb21haW4pXG4gICAgICogIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucy5oZWxwZXJdIFRoZSBoZWxwZXIgcGFnZSBpbmZvLlxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgICAgICB0aGlzLl9zZXRSb290KG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9zZXRJdGVtSW5mbyhvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fc2V0Q29ubmVjdEluZm8ob3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXIob3B0aW9ucy50ZW1wbGF0ZSB8fCBjb25zdHMuSFRNTC5pdGVtKTtcblxuICAgICAgICBpZiAob3B0aW9ucy5oZWxwZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX21ha2VCcmlkZ2VJbmZvRWxlbWVudChvcHRpb25zLmhlbHBlcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHJvb3QoTGlzdCBvYmplY3QpIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFNhbWUgd2l0aCBpbml0IG9wdGlvbnMgcGFyYW1ldGVyLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3NldFJvb3Q6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fcm9vdCA9IG9wdGlvbnMucm9vdDtcbiAgICAgICAgdGhpcy5fJHJvb3QgPSBvcHRpb25zLnJvb3QuJGVsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgZmlsZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBTYW1lIHdpdGggaW5pdCBvcHRpb25zIHBhcmFtZXRlci5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zZXRJdGVtSW5mbzogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gICAgICAgIHRoaXMuX3R5cGUgPSBvcHRpb25zLnR5cGUgfHwgdGhpcy5fZXh0cmFjdEV4dGVuc2lvbigpO1xuICAgICAgICB0aGlzLl9pZCA9IG9wdGlvbnMuaWQgfHwgb3B0aW9ucy5uYW1lO1xuICAgICAgICB0aGlzLnNpemUgPSBvcHRpb25zLnNpemUgfHwgJyc7XG4gICAgICAgIHRoaXMuX2J0bkNsYXNzID0gb3B0aW9ucy5kZWxldGVCdXR0b25DbGFzc05hbWUgfHwgJ3VwbG9hZGVyX2J0bl9kZWxldGUnO1xuICAgICAgICB0aGlzLl91bml0ID0gb3B0aW9ucy51bml0IHx8ICdLQic7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBjb25uZWN0IGVsZW1lbnQgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgU2FtZSB3aXRoIGluaXQgb3B0aW9ucyBwYXJhbWV0ZXIuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc2V0Q29ubmVjdEluZm86IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fdXJsID0gb3B0aW9ucy51cmw7XG4gICAgICAgIHRoaXMuX2hpZGRlbklucHV0TmFtZSA9IG9wdGlvbnMuaGlkZGVuRmllbGROYW1lIHx8ICdmaWxlbmFtZSc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBtYWtpbmcgZm9ybSBwYWRkaW5nIHdpdGggZGVsZXRhYmxlIGl0ZW1cbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXI6IGZ1bmN0aW9uKHRlbXBsYXRlKSB7XG4gICAgICAgIHZhciBodG1sID0gdGhpcy5fZ2V0SHRtbCh0ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMuXyRlbCA9ICQoaHRtbCk7XG4gICAgICAgIHRoaXMuXyRyb290LmFwcGVuZCh0aGlzLl8kZWwpO1xuICAgICAgICB0aGlzLl9hZGRFdmVudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IGZpbGUgZXh0ZW5zaW9uIGJ5IG5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2V4dHJhY3RFeHRlbnNpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYW1lLnNwbGl0KCcuJykucG9wKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1ha2UgZWxlbWVudCB0aGF0IGhhcyByZWRpcmVjdCBwYWdlIGluZm9ybWF0aW9uIHVzZWQgYnkgU2VydmVyIHNpZGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGhlbHBlciBSZWRpcmVjdGlvbiBoZWxwZXIgcGFnZSBpbmZvcm1hdGlvbiBmb3IgY2xlYXIgeC1kb21haW4gcHJvYmxlbS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9tYWtlQnJpZGdlSW5mb0VsZW1lbnQ6IGZ1bmN0aW9uKGhlbHBlcikge1xuICAgICAgICB0aGlzLiRoZWxwZXIgPSAkKCc8aW5wdXQgLz4nKTtcbiAgICAgICAgdGhpcy4kaGVscGVyLmF0dHIoe1xuICAgICAgICAgICAgJ25hbWUnIDogaGVscGVyLm5hbWUsXG4gICAgICAgICAgICAndmFsdWUnOiBoZWxwZXIudXJsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgaXRlbSBlbGVtZW4gSFRNTFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sIEhUTUwgdGVtcGxhdGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldEh0bWw6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgdmFyIG1hcCA9IHtcbiAgICAgICAgICAgIGZpbGV0eXBlOiB0aGlzLl90eXBlLFxuICAgICAgICAgICAgZmlsZW5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgICAgIGZpbGVzaXplOiB0aGlzLnNpemUgPyB1dGlscy5nZXRGaWxlU2l6ZVdpdGhVbml0KHRoaXMuc2l6ZSkgOiAnJyxcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbkNsYXNzTmFtZTogdGhpcy5fYnRuQ2xhc3NcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gdXRpbHMudGVtcGxhdGUobWFwLCBodG1sKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVzdG9yeSBpdGVtXG4gICAgICovXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50KCk7XG4gICAgICAgIHRoaXMuXyRlbC5yZW1vdmUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGV2ZW50IGhhbmRsZXIgb24gZGVsZXRlIGJ1dHRvbi5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hZGRFdmVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBxdWVyeSA9ICcuJyArIHRoaXMuX2J0bkNsYXNzLFxuICAgICAgICAgICAgJGRlbEJ0biA9IHRoaXMuXyRlbC5maW5kKHF1ZXJ5KTtcbiAgICAgICAgJGRlbEJ0bi5vbignY2xpY2snLCB0dWkudXRpbC5iaW5kKHRoaXMuX29uQ2xpY2tFdmVudCwgdGhpcykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgZXZlbnQgaGFuZGxlciBmcm9tIGRlbGV0ZSBidXR0b24uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVtb3ZlRXZlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcXVlcnkgPSAnLicgKyB0aGlzLl9idG5DbGFzcyxcbiAgICAgICAgICAgICRkZWxCdG4gPSB0aGlzLl8kZWwuZmluZChxdWVyeSk7XG4gICAgICAgICRkZWxCdG4ub2ZmKCdjbGljaycpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEV2ZW50LWhhbmRsZSBmb3IgZGVsZXRlIGJ1dHRvbiBjbGlja2VkLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX29uQ2xpY2tFdmVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuZmlyZSgncmVtb3ZlJywge1xuICAgICAgICAgICAgZmlsZW5hbWUgOiB0aGlzLm5hbWUsXG4gICAgICAgICAgICBpZCA6IHRoaXMuX2lkLFxuICAgICAgICAgICAgdHlwZTogJ3JlbW92ZSdcbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cbnR1aS51dGlsLkN1c3RvbUV2ZW50cy5taXhpbihJdGVtKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJdGVtO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEZpbGVMaXN0VmlldyBtYW5hZ2UgYW5kIGRpc3BsYXkgZmlsZXMgc3RhdGUobGlrZSBzaXplLCBjb3VudCkgYW5kIGxpc3QuXG4gKiBAZGVwZW5kZW5jeSBuZS1jb2RlLXNuaXBwZXQgMS4wLjMsIGpxdWVyeTEuOC4zXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIERldmVsb3BtZW50IFRlYW0gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBJdGVtID0gcmVxdWlyZSgnLi9pdGVtJyk7XG5cbi8qKlxuICogTGlzdCBoYXMgaXRlbXMuIEl0IGNhbiBhZGQgYW5kIHJlbW92ZSBpdGVtLCBhbmQgZ2V0IHRvdGFsIHVzYWdlLlxuICogQGNsYXNzIFZpZXcuTGlzdFxuICovXG52YXIgTGlzdCA9IHR1aS51dGlsLmRlZmluZUNsYXNzKC8qKiBAbGVuZHMgVmlldy5MaXN0LnByb3RvdHlwZSAqL3tcbiAgICBpbml0IDogZnVuY3Rpb24ob3B0aW9ucywgdXBsb2FkZXIpIHtcbiAgICAgICAgdmFyIGxpc3RJbmZvID0gb3B0aW9ucy5saXN0SW5mbztcbiAgICAgICAgdGhpcy5pdGVtcyA9IFtdO1xuICAgICAgICB0aGlzLiRlbCA9IGxpc3RJbmZvLmxpc3Q7XG4gICAgICAgIHRoaXMuJGNvdW50ZXIgPSBsaXN0SW5mby5jb3VudDtcbiAgICAgICAgdGhpcy4kc2l6ZSA9IGxpc3RJbmZvLnNpemU7XG4gICAgICAgIHRoaXMuX3VwbG9hZGVyID0gdXBsb2FkZXI7XG5cbiAgICAgICAgdHVpLnV0aWwuZXh0ZW5kKHRoaXMsIG9wdGlvbnMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaXRlbSBsaXN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluZm8gQSBpbmZvcm1hdGlvbiB0byB1cGRhdGUgbGlzdC5cbiAgICAgKiAgQHBhcmFtIHthcnJheX0gaW5mby5pdGVtcyBUaGUgbGlzdCBvZiBmaWxlIGluZm9ybWF0aW9uLlxuICAgICAqICBAcGFyYW0ge3N0cmluZ30gW2luZm8uYWN0aW9uXSBUaGUgYWN0aW9uIHRvIGRvLlxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24oaW5mbykge1xuICAgICAgICBpZiAoaW5mby5hY3Rpb24gPT09ICdyZW1vdmUnKSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVGaWxlSXRlbShpbmZvLm5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fYWRkRmlsZUl0ZW1zKGluZm8uaXRlbXMpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpdGVtcyB0b3RhbCBjb3VudCwgdG90YWwgc2l6ZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5mbyBBIGluZm9ybWF0aW9uIHRvIHVwZGF0ZSBsaXN0LlxuICAgICAqICBAcGFyYW0ge2FycmF5fSBpbmZvLml0ZW1zIFRoZSBsaXN0IG9mIGZpbGUgaW5mb3JtYXRpb24uXG4gICAgICogIEBwYXJhbSB7c3RyaW5nfSBpbmZvLnNpemUgVGhlIHRvdGFsIHNpemUuXG4gICAgICogIEBwYXJhbSB7c3RyaW5nfSBpbmZvLmNvdW50IFRoZSBjb3VudCBvZiBmaWxlcy5cbiAgICAgKi9cbiAgICB1cGRhdGVUb3RhbEluZm86IGZ1bmN0aW9uKGluZm8pIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlVG90YWxDb3VudChpbmZvLmNvdW50KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlVG90YWxVc2FnZShpbmZvLnNpemUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaXRlbXMgdG90YWwgY291bnQgYW5kIHJlZnJlc2ggZWxlbWVudFxuICAgICAqIEBwYXJhbSB7KG51bWJlcnxzdHJpbmcpfSBbY291bnRdIFRvdGFsIGZpbGUgY291bnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF91cGRhdGVUb3RhbENvdW50OiBmdW5jdGlvbihjb3VudCkge1xuXG4gICAgICAgIGlmICghdHVpLnV0aWwuaXNFeGlzdHkoY291bnQpKSB7XG4gICAgICAgICAgICBjb3VudCA9IHRoaXMuaXRlbXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy4kY291bnRlci5odG1sKGNvdW50KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGl0ZW1zIHRvdGFsIHNpemUgYW5kIHJlZnJlc2ggZWxlbWVudFxuICAgICAqIEBwYXJhbSB7KG51bWJlcnxzdHJpbmcpfSBzaXplIFRvdGFsIGZpbGVzIHNpemVzXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfdXBkYXRlVG90YWxVc2FnZTogZnVuY3Rpb24oc2l6ZSkge1xuXG4gICAgICAgIGlmICghdHVpLnV0aWwuaXNFeGlzdHkoc2l6ZSkpIHtcbiAgICAgICAgICAgIHNpemUgPSB0aGlzLl9nZXRTdW1BbGxJdGVtVXNhZ2UoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHVpLnV0aWwuaXNOdW1iZXIoc2l6ZSkgJiYgIWlzTmFOKHNpemUpKSB7XG4gICAgICAgICAgICBzaXplID0gdXRpbHMuZ2V0RmlsZVNpemVXaXRoVW5pdChzaXplKTtcbiAgICAgICAgICAgIHRoaXMuJHNpemUuaHRtbChzaXplKTtcbiAgICAgICAgICAgIHRoaXMuJHNpemUuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kc2l6ZS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VtIHNpemVzIG9mIGFsbCBpdGVtcy5cbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXRTdW1BbGxJdGVtVXNhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaXRlbXMgPSB0aGlzLml0ZW1zLFxuICAgICAgICAgICAgdG90YWxVc2FnZSA9IDA7XG5cbiAgICAgICAgdHVpLnV0aWwuZm9yRWFjaChpdGVtcywgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgdG90YWxVc2FnZSArPSBwYXJzZUZsb2F0KGl0ZW0uc2l6ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0b3RhbFVzYWdlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgZmlsZSBpdGVtc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgVGFyZ2V0IGl0ZW0gaW5mb3JtYXRpb24uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYWRkRmlsZUl0ZW1zOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgICAgaWYgKCF0dWkudXRpbC5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgICAgIHRhcmdldCA9IFt0YXJnZXRdO1xuICAgICAgICB9XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGFyZ2V0LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zLnB1c2godGhpcy5fY3JlYXRlSXRlbShkYXRhKSk7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHRoaXMuZmlyZSgnZmlsZUFkZGVkJywge1xuICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXRcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBmaWxlIGl0ZW1cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgZmlsZSBuYW1lIHRvIHJlbW92ZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3JlbW92ZUZpbGVJdGVtOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIG5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQobmFtZSk7XG4gICAgICAgIHR1aS51dGlsLmZvckVhY2godGhpcy5pdGVtcywgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBkZWNvZGVVUklDb21wb25lbnQoaXRlbS5uYW1lKSkge1xuICAgICAgICAgICAgICAgIGl0ZW0uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwbG9hZGVyLnJlbW92ZShuYW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZpcmUoJ2ZpbGVSZW1vdmVkJywge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpdGVtIEJ5IERhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtJdGVtfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZUl0ZW06IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgdmFyIGl0ZW0gPSBuZXcgSXRlbSh7XG4gICAgICAgICAgICByb290OiB0aGlzLFxuICAgICAgICAgICAgbmFtZTogZGF0YS5uYW1lLFxuICAgICAgICAgICAgc2l6ZTogZGF0YS5zaXplLFxuICAgICAgICAgICAgZGVsZXRlQnV0dG9uQ2xhc3NOYW1lOiB0aGlzLmRlbGV0ZUJ1dHRvbkNsYXNzTmFtZSxcbiAgICAgICAgICAgIHVybDogdGhpcy51cmwsXG4gICAgICAgICAgICBoaWRkZW5GcmFtZTogdGhpcy5mb3JtVGFyZ2V0LFxuICAgICAgICAgICAgaGlkZGVuRmllbGROYW1lOiB0aGlzLmhpZGRlbkZpZWxkTmFtZSxcbiAgICAgICAgICAgIHRlbXBsYXRlOiB0aGlzLnRlbXBsYXRlICYmIHRoaXMudGVtcGxhdGUuaXRlbVxuICAgICAgICB9KTtcbiAgICAgICAgaXRlbS5vbigncmVtb3ZlJywgdGhpcy5fcmVtb3ZlRmlsZSwgdGhpcyk7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBSZW1vdmUgRmlsZVxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVtb3ZlRmlsZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB0aGlzLmZpcmUoJ3JlbW92ZScsIGRhdGEpO1xuICAgIH1cbn0pO1xuXG50dWkudXRpbC5DdXN0b21FdmVudHMubWl4aW4oTGlzdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gTGlzdDtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBUaGlzIGlzIG1hbmFnZXIgb2YgaW5wdXQgZWxlbWVudHMgdGhhdCBhY3QgbGlrZSBmaWxlIHBvb2wuXG4gKiBAYXV0aG9yIE5ITiBFbnQuIEZFIERldmVsb3BtZW50IFRlYW0gPGRsX2phdmFzY3JpcHRAbmhuZW50LmNvbT5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIGZvckVhY2ggPSB0dWkudXRpbC5mb3JFYWNoO1xuXG4vKipcbiAqIFRoZSBwb29sIGZvciBzYXZlIGZpbGVzLlxuICogSXQncyBvbmx5IGZvciBpbnB1dFtmaWxlXSBlbGVtZW50IHNhdmUgYXQgYnJvd3NlciB0aGF0IGRvZXMgbm90IHN1cHBvcnQgZmlsZSBhcGkuXG4gKiBAY2xhc3MgVmlldy5Qb29sXG4gKi9cbnZhciBQb29sID0gdHVpLnV0aWwuZGVmaW5lQ2xhc3MoLyoqIEBsZW5kcyBWaWV3LlBvb2wucHJvdG90eXBlICove1xuICAgIC8qKlxuICAgICAqIGluaXRpYWxpemVcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbihwbGFuZXQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1Ym1pdHRlciBmb3IgZmlsZSBlbGVtZW50IHRvIHNlcnZlclxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnBsYW5ldCA9IHBsYW5ldDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpbGUgZGF0YSBzdHJ1Y3R1cmUgb2JqZWN0KGtleT1uYW1lIDogdmFsdWU9aXVwdXQgZWxtZWVudCk7XG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmZpbGVzID0ge307XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBY3RzIHBvb2wgdG8gc2F2ZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAqIEB0eXBlIHtEb2N1bWVudEZyYWdtZW50fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5mcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIGEgaW5wdXQgZWxlbWVudFt0eXBlPWZpbGVdLCBhcyB2YWx1ZSBvZiBmaWxlIG5hbWUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpbGUgQSBpbnB1dCBlbGVtZW50IHRoYXQgaGF2ZSB0byBiZSBzYXZlZFxuICAgICAqIEB0b2RvIHJlbmFtZSB2YXJpYWJsZTogXCJmaWxlX25hbWVcIlxuICAgICAqL1xuICAgIHN0b3JlOiBmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgIHZhciBmaWxlbmFtZSA9IGZpbGUuZmlsZV9uYW1lLFxuICAgICAgICAgICAgZmlsZUVsZW1lbnRzID0gdGhpcy5maWxlc1tmaWxlbmFtZV0gPSB0aGlzLmZpbGVzW2ZpbGVuYW1lXSB8fCBbXTtcbiAgICAgICAgZmlsZUVsZW1lbnRzLnB1c2goZmlsZSk7XG4gICAgICAgIHRoaXMuZnJhZy5hcHBlbmRDaGlsZChmaWxlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGEgaW5wdXQgZWxlbWVudFt0eXBlPWZpbGVdIGZyb20gcG9vbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBBIGZpbGUgbmFtZSB0aGF0IGhhdmUgdG8gYmUgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gdGhpcy5maWxlc1tuYW1lXTtcblxuICAgICAgICBpZiAoIWVsZW1lbnRzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZyYWcucmVtb3ZlQ2hpbGQoZWxlbWVudHMucG9wKCkpO1xuICAgICAgICBpZiAoIWVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZmlsZXNbbmFtZV07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW1wdHkgcG9vbFxuICAgICAqL1xuICAgIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5mcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB0aGlzLmZpbGVzID0ge307XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBsYW50IGZpbGVzIG9uIHBvb2wgdG8gZm9ybSBpbnB1dFxuICAgICAqL1xuICAgIHBsYW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBsYW5ldCA9IHRoaXMucGxhbmV0O1xuICAgICAgICBmb3JFYWNoKHRoaXMuZmlsZXMsIGZ1bmN0aW9uKGVsZW1lbnRzLCBmaWxlbmFtZSkge1xuICAgICAgICAgICAgZm9yRWFjaChlbGVtZW50cywgZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHBsYW5ldC5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZmlsZXNbZmlsZW5hbWVdO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBQb29sO1xuIl19
