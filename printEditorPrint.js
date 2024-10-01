(function () {
    let printMenuId = EditorUiSdk.createAction({
        label: 'Print',
    });

    EditorUiSdk.createSubAction(printMenuId, {
        label: 'Print article',
        icon: '',
        click: function () {
            ContentStationSdk.showNotification({
                content: 'The print preview is being generated, one moment please...'
            });

            printArticle(true);
        }
    });

    EditorUiSdk.createSubAction(printMenuId, {
        label: 'Print compare',
        icon: '',
        click: function () {
            ContentStationSdk.showNotification({
                content: 'The print preview is being generated, one moment please...'
            });

            printArticle(false);
        }
    });

    loadJQuery()

    async function addScript(src, integrity, crossOrigin) {
        return new Promise((resolve, reject) => {
            // Use pure JS as we cannot assume jQuery is available.
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = src;
            script.integrity = integrity;
            script.crossOrigin = crossOrigin;
            script.onload = (event) => {
                resolve(event);
            };
            script.onerror = (event) => {
                reject(event);
            };
            document.head.appendChild(script);
        });
    }

    async function loadJQuery() {
        // Source: https://code.jquery.com/
        await addScript(
            'https://code.jquery.com/jquery-3.5.1.min.js',
            'sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=',
            'anonymous',
        );
        // Ensure that our jQuery dependency is not conflicting with jQuery in the main application.
        this.$ = jQuery.noConflict();

        initPrintThis();
    }

    /**
     * Post request
     * 
     * @param {*} url 
     * @param {*} request 
     * @param {*} callback 
     */
    function callAjax(url, request, callback) {
        $.ajaxSetup({
            headers: {
                'X-WoodWing-Application': 'Content Station'
            }
        });

        $.post(url, JSON.stringify(request),
            function (data) {
                callback(data);
            }
        );
    }

    /**
     * Get the article metadata and print the article
     */
    function printArticle(articleView) {
        var info = ContentStationSdk.getInfo();
        var articleId = window.location.href.substr(window.location.href.lastIndexOf('/') + 1);
        var getObjectsRequest = {
            "method": "GetObjects",
            "id": "1",
            "params": [
                {
                    "IDs": [],
                    "Lock": false,
                    "Rendition": "native",
                    "RequestInfo": [
                        "Relations",
                        "Targets"
                    ],
                    "Areas": [
                        "Workflow"
                    ],
                    "EditionId": null,
                    "SupportedContentSources": null
                }
            ],
            "jsonrpc": "2.0"
        };
        getObjectsRequest.params[0].IDs.push(articleId);

        //Set ticket for older servers 
        if (info.Ticket) {
            getObjectsRequest.params[0].Ticket = info.Ticket;
        }

        callAjax(info.ServerInfo.URL + "?protocol=JSON&method=GetObjects", getObjectsRequest, function (result) {
            var header = createHeader(result.result.Objects[0]);
            var contentSelector;

            if (articleView) {
                contentSelector = $("article-editor article");
            } else {
                contentSelector = $("article-compare-content article");
            }

            contentSelector.printThis({
                debug: false,               // show the iframe for debugging
                importCSS: true,            // import parent page css
                importStyle: true,          // import style tags
                printContainer: true,       // print outer container/$.selector
                loadCSS: "",                // path to additional css file - use an array [] for multiple
                pageTitle: "",              // add title to print page
                removeInline: false,        // remove inline styles from print elements
                removeInlineSelector: "*",  // custom selectors to filter inline styles. removeInline must be true
                printDelay: 1000,            // variable print delay
                header: "<style>img {max-height: 15px;max-width: 15px;}</style> " + header, // prefix to html
                footer: "",               // postfix to html
                base: true,                // preserve the BASE tag or accept a string for the URL
                formValues: true,           // preserve input/form values
                canvas: false,              // copy canvas content
                doctypeString: '<!DOCTYPE html>', // enter a different doctype for older markup
                removeScripts: false,       // remove script tags from print content
                copyTagClasses: true,      // copy classes from the html & body tag
                beforePrintEvent: null,     // callback function for printEvent in iframe
                beforePrint: null,          // function called before iframe is filled
                afterPrint: null            // function called before iframe is removed
            });
        });
    }

    /**
     * Create the header HTML
     * 
     * @param {} article 
     */
    function createHeader(article) {
        var info = ContentStationSdk.getInfo();
        var html = "";

        html += "<style>\n";
        html += ".print-header table {border-collapse:collapse;}\n";
        html += ".print-header td {\n";
        html += "    border-style:solid;\n";
        html += "    border-width:1px;\n";
        html += "    border-color:#333333;\n";
        html += "    padding:10px;\n";
        html += " }\n";
        html += "</style>\n";

        html += "<div class='print-header'>\n";
        html += "  <h1>" + article.MetaData.BasicMetaData.Name + "</h1>\n";
        html += "  <br>";
        html += "  <br>";
        html += "  <table width='100%'>\n";
        html += "     <tbody>\n";
        html += "        <tr><td>Printed by</td><td>" + info.CurrentUser.FullName + " </td></tr>\n";
        html += "        <tr><td>Printed on</td><td>" + new Date().toLocaleString() + " </td></tr>\n";
        html += "        <tr><td>Brand</td><td>" + article.MetaData.BasicMetaData.Publication.Name + " </td></tr>\n";
        html += "        <tr><td>Issues</td><td>" + getIssues(article) + " </td></tr>\n";
        html += "        <tr><td>Category</td><td>" + article.MetaData.BasicMetaData.Category.Name + " </td></tr>\n";
        html += "        <tr><td>Status</td><td>" + article.MetaData.WorkflowMetaData.State.Name + " </td></tr>\n";
        html += "        <tr><td>Route To</td><td>" + article.MetaData.WorkflowMetaData.RouteTo + " </td></tr>\n";
        html += "        <tr><td>Comment</td><td>" + article.MetaData.WorkflowMetaData.Comment + " </td></tr>\n";
        html += "     </tbody>\n";
        html += "  </table>\n";
        html += "  <br>";
        html += "  <br>";
        html += "</div>\n";

        return html;
    }


    /**
     * Returns a comma separated list of issues the article is related to
     */
    function getIssues(article) {
        var issues = [];
        if (article.Relations != null) {
            article.Relations.forEach(function (relation) {
                if (relation.Targets != null) {
                    relation.Targets.forEach(function (target) {
                        if (!issues.includes(target.Issue.Name)) {
                            issues.push(target.Issue.Name);
                        }
                    });
                }
            });
        }

        return issues.join(', ');
    }


    function initPrintThis() {
        /*
        * printThis v1.14.0
        * @desc Printing plug-in for jQuery
        * @author Jason Day
        *
        * Resources (based on):
        * - jPrintArea: http://plugins.jquery.com/project/jPrintArea
        * - jqPrint: https://github.com/permanenttourist/jquery.jqprint
        * - Ben Nadal: http://www.bennadel.com/blog/1591-Ask-Ben-Print-Part-Of-A-Web-Page-With-jQuery.htm
        *
        * Licensed under the MIT licence:
        *              http://www.opensource.org/licenses/mit-license.php
        *
        * (c) Jason Day 2015-2018
        *
        * Usage:
        *
        *  $("#mySelector").printThis({
        *      debug: false,                   // show the iframe for debugging
        *      importCSS: true,                // import parent page css
        *      importStyle: false,             // import style tags
        *      printContainer: true,           // grab outer container as well as the contents of the selector
        *      loadCSS: "path/to/my.css",      // path to additional css file - use an array [] for multiple
        *      pageTitle: "",                  // add title to print page
        *      removeInline: false,            // remove all inline styles from print elements
        *      removeInlineSelector: "body *", // custom selectors to filter inline styles. removeInline must be true
        *      printDelay: 333,                // variable print delay
        *      header: null,                   // prefix to html
        *      footer: null,                   // postfix to html
        *      base: false,                    // preserve the BASE tag, or accept a string for the URL
        *      formValues: true,               // preserve input/form values
        *      canvas: false,                  // copy canvas elements
        *      doctypeString: '...',           // enter a different doctype for older markup
        *      removeScripts: false,           // remove script tags from print content
        *      copyTagClasses: false           // copy classes from the html & body tag
        *      beforePrintEvent: null,         // callback function for printEvent in iframe
        *      beforePrint: null,              // function called before iframe is filled
        *      afterPrint: null                // function called before iframe is removed
        *  });
        *
        * Notes:
        *  - the loadCSS will load additional CSS (with or without @media print) into the iframe, adjusting layout
        */
        ;
        (function ($) {

            function appendContent($el, content) {
                if (!content) return;

                // Simple test for a jQuery element
                $el.append(content.jquery ? content.clone() : content);
            }

            function appendBody($body, $element, opt) {
                // Clone for safety and convenience
                // Calls clone(withDataAndEvents = true) to copy form values.
                var $content = $element.clone(opt.formValues);

                if (opt.formValues) {
                    // Copy original select and textarea values to their cloned counterpart
                    // Makes up for inability to clone select and textarea values with clone(true)
                    copyValues($element, $content, 'select, textarea');
                }

                if (opt.removeScripts) {
                    $content.find('script').remove();
                }

                if (opt.printContainer) {
                    // grab $.selector as container
                    $content.appendTo($body);
                } else {
                    // otherwise just print interior elements of container
                    $content.each(function () {
                        $(this).children().appendTo($body)
                    });
                }
            }

            // Copies values from origin to clone for passed in elementSelector
            function copyValues(origin, clone, elementSelector) {
                var $originalElements = origin.find(elementSelector);

                clone.find(elementSelector).each(function (index, item) {
                    $(item).val($originalElements.eq(index).val());
                });
            }

            var opt;
            $.fn.printThis = function (options) {
                opt = $.extend({}, $.fn.printThis.defaults, options);
                var $element = this instanceof jQuery ? this : $(this);

                var strFrameName = "printThis-" + (new Date()).getTime();

                if (window.location.hostname !== document.domain && navigator.userAgent.match(/msie/i)) {
                    // Ugly IE hacks due to IE not inheriting document.domain from parent
                    // checks if document.domain is set by comparing the host name against document.domain
                    var iframeSrc = "javascript:document.write(\"<head><script>document.domain=\\\"" + document.domain + "\\\";</s" + "cript></head><body></body>\")";
                    var printI = document.createElement('iframe');
                    printI.name = "printIframe";
                    printI.id = strFrameName;
                    printI.className = "MSIE";
                    document.body.appendChild(printI);
                    printI.src = iframeSrc;

                } else {
                    // other browsers inherit document.domain, and IE works if document.domain is not explicitly set
                    var $frame = $("<iframe id='" + strFrameName + "' name='printIframe' />");
                    $frame.appendTo("body");
                }

                var $iframe = $("#" + strFrameName);

                // show frame if in debug mode
                if (!opt.debug) $iframe.css({
                    position: "absolute",
                    width: "0px",
                    height: "0px",
                    left: "-600px",
                    top: "-600px"
                });

                // before print callback
                if (typeof opt.beforePrint === "function") {
                    opt.beforePrint($iframe);
                }

                // $iframe.ready() and $iframe.load were inconsistent between browsers
                setTimeout(function () {

                    // Add doctype to fix the style difference between printing and render
                    function setDocType($iframe, doctype) {
                        var win, doc;
                        win = $iframe.get(0);
                        win = win.contentWindow || win.contentDocument || win;
                        doc = win.document || win.contentDocument || win;
                        doc.open();
                        doc.write(doctype);
                        doc.close();
                    }

                    if (opt.doctypeString) {
                        setDocType($iframe, opt.doctypeString);
                    }

                    var $doc = $iframe.contents(),
                        $head = $doc.find("head"),
                        $body = $doc.find("body"),
                        $base = $('base'),
                        baseURL;

                    // add base tag to ensure elements use the parent domain
                    if (opt.base === true && $base.length > 0) {
                        // take the base tag from the original page
                        baseURL = $base.attr('href');
                    } else if (typeof opt.base === 'string') {
                        // An exact base string is provided
                        baseURL = opt.base;
                    } else {
                        // Use the page URL as the base
                        baseURL = document.location.protocol + '//' + document.location.host;
                    }

                    $head.append('<base href="' + baseURL + '">');

                    // import page stylesheets
                    if (opt.importCSS) $("link[rel=stylesheet]").each(function () {
                        var href = $(this).attr("href");
                        if (href) {
                            var media = $(this).attr("media") || "all";
                            $head.append("<link type='text/css' rel='stylesheet' href='" + href + "' media='" + media + "'>");
                        }
                    });

                    // import style tags
                    if (opt.importStyle) $("style").each(function () {
                        $head.append(this.outerHTML);
                    });



                    // add title of the page
                    if (opt.pageTitle) $head.append("<title>" + opt.pageTitle + "</title>");

                    // import additional stylesheet(s)
                    if (opt.loadCSS) {
                        if ($.isArray(opt.loadCSS)) {
                            jQuery.each(opt.loadCSS, function (index, value) {
                                $head.append("<link type='text/css' rel='stylesheet' href='" + this + "'>");
                            });
                        } else {
                            $head.append("<link type='text/css' rel='stylesheet' href='" + opt.loadCSS + "'>");
                        }
                    }

                    var pageHtml = $('html')[0];

                    // CSS VAR in html tag when dynamic apply e.g.  document.documentElement.style.setProperty("--foo", bar);
                    $doc.find('html').prop('style', pageHtml.style.cssText);

                    // copy 'root' tag classes
                    var tag = opt.copyTagClasses;
                    if (tag) {
                        tag = tag === true ? 'bh' : tag;
                        if (tag.indexOf('b') !== -1) {
                            $body.addClass($('body')[0].className);
                        }
                        if (tag.indexOf('h') !== -1) {
                            $doc.find('html').addClass(pageHtml.className);
                        }
                    }

                    // print header
                    //WoodWing 20190830: Add header to print editor article instead of body
                    //appendContent($body, opt.header);

                    if (opt.canvas) {
                        // add canvas data-ids for easy access after cloning.
                        var canvasId = 0;
                        // .addBack('canvas') adds the top-level element if it is a canvas.
                        $element.find('canvas').addBack('canvas').each(function () {
                            $(this).attr('data-printthis', canvasId++);
                        });
                    }

                    appendBody($body, $element, opt);

                    if (opt.canvas) {
                        // Re-draw new canvases by referencing the originals
                        $body.find('canvas').each(function () {
                            var cid = $(this).data('printthis'),
                                $src = $('[data-printthis="' + cid + '"]');

                            this.getContext('2d').drawImage($src[0], 0, 0);

                            // Remove the markup from the original
                            $src.removeData('printthis');
                        });
                    }

                    // remove inline styles
                    if (opt.removeInline) {
                        // Ensure there is a selector, even if it's been mistakenly removed
                        var selector = opt.removeInlineSelector || '*';
                        // $.removeAttr available jQuery 1.7+
                        if ($.isFunction($.removeAttr)) {
                            $body.find(selector).removeAttr("style");
                        } else {
                            $body.find(selector).attr("style", "");
                        }
                    }

                    //WoodWing 20190830: Add header to print editor article instead of body
                    //WoodWing 20200108: Overwrite overflow and position to prevent that only the first page is printed 
                    $body.find('article').prepend(opt.header);
                    $body.find('article').css("overflow", "unset");
                    $body.find('article').css("position", "absolute");

                    // print "footer"
                    appendContent($body, opt.footer);

                    // attach event handler function to beforePrint event
                    function attachOnBeforePrintEvent($iframe, beforePrintHandler) {
                        var win = $iframe.get(0);
                        win = win.contentWindow || win.contentDocument || win;

                        if (typeof beforePrintHandler === "function") {
                            if ('matchMedia' in win) {
                                win.matchMedia('print').addListener(function (mql) {
                                    if (mql.matches) beforePrintHandler();
                                });
                            } else {
                                win.onbeforeprint = beforePrintHandler;
                            }
                        }
                    }
                    attachOnBeforePrintEvent($iframe, opt.beforePrint);

                    setTimeout(function () {
                        if ($iframe.hasClass("MSIE")) {
                            // check if the iframe was created with the ugly hack
                            // and perform another ugly hack out of neccessity
                            window.frames["printIframe"].focus();
                            $head.append("<script>  window.print(); </s" + "cript>");
                        } else {
                            // proper method
                            if (document.queryCommandSupported("print")) {
                                $iframe[0].contentWindow.document.execCommand("print", false, null);
                            } else {
                                $iframe[0].contentWindow.focus();
                                $iframe[0].contentWindow.print();
                            }
                        }

                        // remove iframe after print
                        if (!opt.debug) {
                            setTimeout(function () {
                                $iframe.remove();

                            }, 1000);
                        }

                        // after print callback
                        if (typeof opt.afterPrint === "function") {
                            opt.afterPrint();
                        }

                    }, opt.printDelay);

                }, 333);

            };

            // defaults
            $.fn.printThis.defaults = {
                debug: false,               // show the iframe for debugging
                importCSS: true,            // import parent page css
                importStyle: false,         // import style tags
                printContainer: true,       // print outer container/$.selector
                loadCSS: "",                // path to additional css file - use an array [] for multiple
                pageTitle: "",              // add title to print page
                removeInline: false,        // remove inline styles from print elements
                removeInlineSelector: "*",  // custom selectors to filter inline styles. removeInline must be true
                printDelay: 333,            // variable print delay
                header: null,               // prefix to html
                footer: null,               // postfix to html
                base: false,                // preserve the BASE tag or accept a string for the URL
                formValues: true,           // preserve input/form values
                canvas: false,              // copy canvas content
                doctypeString: '<!DOCTYPE html>', // enter a different doctype for older markup
                removeScripts: false,       // remove script tags from print content
                copyTagClasses: false,      // copy classes from the html & body tag
                beforePrintEvent: null,     // callback function for printEvent in iframe
                beforePrint: null,          // function called before iframe is filled
                afterPrint: null            // function called before iframe is removed
            };
        })(jQuery);
    }
})();
