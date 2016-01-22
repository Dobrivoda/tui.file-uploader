tui.util.defineNamespace("fedoc.content", {});
fedoc.content["view_pool.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @fileoverview This is manager of input elements that act like file pool.\n * @author NHN Ent. FE Development Team &lt;dl_javascript@nhnent.com>\n */\n'use strict';\nvar forEach = tui.util.forEach;\n\n/**\n * The pool for save files.\n * It's only for input[file] element save at browser that does not support file api.\n * @class View.Pool\n */\nvar Pool = tui.util.defineClass(/** @lends View.Pool.prototype */{\n    /**\n     * initialize\n     */\n    init: function(planet) {\n        /**\n         * Submitter for file element to server\n         * @type {HTMLElement}\n         */\n        this.planet = planet;\n        /**\n         * File data structure object(key=name : value=iuput elmeent);\n         * @type {object}\n         */\n        this.files = {};\n        /**\n         * Acts pool to save input element\n         * @type {DocumentFragment}\n         */\n        this.frag = document.createDocumentFragment();\n    },\n\n    /**\n     * Save a input element[type=file], as value of file name.\n     * @param {object} file A input element that have to be saved\n     * @todo rename variable: \"file_name\"\n     */\n    store: function(file) {\n        var filename = file.file_name,\n            fileElements = this.files[filename] = this.files[filename] || [];\n        fileElements.push(file);\n        this.frag.appendChild(file);\n    },\n\n    /**\n     * Remove a input element[type=file] from pool.\n     * @param {string} name A file name that have to be removed.\n     */\n    remove: function(name) {\n        var elements = this.files[name];\n\n        if (!elements) {\n            return;\n        }\n\n        this.frag.removeChild(elements.pop());\n        if (!elements.length) {\n            delete this.files[name];\n        }\n    },\n\n    /**\n     * Empty pool\n     */\n    empty: function() {\n        this.frag = document.createDocumentFragment();\n        this.files = {};\n    },\n\n    /**\n     * Plant files on pool to form input\n     */\n    plant: function() {\n        var planet = this.planet;\n        forEach(this.files, function(elements, filename) {\n            forEach(elements, function(element) {\n                planet.appendChild(element);\n            });\n            delete this.files[filename];\n        }, this);\n    }\n});\n\nmodule.exports = Pool;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"