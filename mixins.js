function merge(target, source) {
    return Object.keys(source).reduce(function (target, key) {
        target[key] = source[key];
        return target;
    }, target);
}

function inspect(v) {
    console.log(v);
    return v;
}

var withChildComponents = (function () {
    'use strict';

    var teardownEventCount = 0;

    function withBoundLifecycle() {
        this.defaultAttrs({
            teardownOn: ''
        });

        /**
         * If we were given a teardownOn event then listen out for it to teardown.
         */
        this.after('initialize', function () {
            if (this.attr.teardownOn) {
                if (this.attr.teardownOn === this.childTeardownEvent) {
                    throw new Error('Component initialized to listen for its own teardown event.');
                }
                this.on(document, this.attr.teardownOn, function () {
                    this.teardown();
                });
            }
        });
    }

    function withChildComponents() {
        /**
         * Give every component that uses this mixin a new, unique childTeardownEvent
         */
        this.before('initialize', function () {
            this.childTeardownEvent =
                this.childTeardownEvent ||
                withChildComponents.nextTeardownEvent();
        });

        /**
         * Before this component's teardown, tell all the children to teardown
         */
        this.before('teardown', function () {
            this.trigger(this.childTeardownEvent);
        });

        /**
         * Utility method for attaching a component with teardownOn.
         *
         * Takes Component (with attachTo method) plus destination and attrs arguments, which should
         * be the same as in a normal attachTo call.
         */
        this.attachChild = function (Component, destination, attrs) {
            attrs = attrs || {};
            if (!attrs.teardownOn) {
                attrs.teardownOn = this.childTeardownEvent;
            }
            var mixins = Component.prototype.mixedIn || [];
            var isMixedIn = (mixins.indexOf(withBoundLifecycle) > -1) ? true : false;
            (isMixedIn ?
                Component :
                Component.mixin(withBoundLifecycle)).attachTo(destination, attrs);
        };

    }

    withChildComponents.nextTeardownEvent = function () {
        teardownEventCount += 1;
        return '_teardownEvent' + teardownEventCount;
    };

    // Export the child lifecycle mixin
    withChildComponents.withBoundLifecycle = withBoundLifecycle;

    return withChildComponents;
}());

function withState() {
    this.initialState = function (newState) {
        this.stateDef = merge(this.stateDef || {}, newState);
    };

    this.setState = function (newState) {
        return merge(this.state, newState);
    };

    this.fromState = function (key) {
        return function () {
            return this.state[key]
        };
    };

    this.after('initialize', function () {
        var stateDef = (this.stateDef || {});
        var ctx = this;
        this.state = Object.keys(stateDef).reduce(function (state, k) {
            var value = stateDef[k];
            state[k] = (typeof value === 'function' ? value.call(ctx) : value);
            return state;
        }, {});

        setTimeout(function () {
            this.setState(this.state);
        }.bind(this), 0);
    });
}

function withBatchedUpdates() {
    var queue = [];
    function go() {
        while (queue.length) {
            queue.shift().call(queue.shift());
        }
    }
    this.batch = function (fn) {
        var len = queue.length;
        queue.push(fn, this);
        if (!len) {
            requestAnimationFrame(go);
        }
    };
    this.batchify = function (method) {
        var ctx = this;
        return function () {
            return ctx.batch(ctx[method]);
        };
    };
}

function withTimeout() {
    var timers = {};
    this.timeout = function (fn, time) {
        var ctx = this;
        return setTimeout(this.batchify(fn), time);
    };
    this.interval = function (fn, time) {
        var ctx = this;
        return setInterval(this.batchify(fn), time);
    };
};

function withRender() {
    function callTo(o, method /*, args... */) {
        var args = [].slice.call(arguments, 2);
        return function () {
            return o[method].apply(o, args);
        };
    }

    function call(fn) {
        return fn();
    }

    this.setupRender = function (selector, config) {
        if (!config) {
            config = selector;
            selector = undefined;
        }
        this.renderDefs = (this.renderDefs || []).concat({
            selector: selector,
            config: config
        });
    };

    this.render = function () {
        var newRenderStates = this.calculateRenderStates(this.renderConfigs);
        var previousRenderStates = this._prevRenderStates || [];
        newRenderStates
            .reduce(function (actions, newRenderState, i) {
                var $node = $(newRenderState.node || this.select(newRenderState.selector));
                var previousRenderState = previousRenderStates[i];
                return Object.keys(newRenderState.state)
                    .reduce(function (actions, k) {
                        var oldValue = (previousRenderState ? previousRenderState.state[k] : undefined);
                        var newValue = newRenderState.state[k];
                        if (oldValue !== newValue && typeof $node[k] === 'function') {
                            return actions.concat(
                                callTo($node, k, newValue)
                            );
                        }
                        return actions;
                    }, actions);
            }.bind(this), [])
            .forEach(call);
        this._prevRenderStates = newRenderStates;
    };

    this.calculateRenderState = function (renderConfig) {
        return Object.keys(renderConfig).reduce(function (memo, k) {
            var value = renderConfig[k];
            if (typeof value === 'function') {
                memo[k] = value.call(this);
            }
            if (typeof value === 'object' && !Array.isArray(value)) {
                memo[k] = this.calculateRenderState(value);
            }
            return memo;
        }.bind(this), {});
    };

    this.calculateRenderStates = function (renderConfigs) {
        return renderConfigs.map(function (renderConfig) {
            var state = this.calculateRenderState(renderConfig.config);
            return {
                node: renderConfig.node,
                selector: renderConfig.selector,
                config: renderConfig.config,
                state: state
            };
        }, this);
    };

    this.calculateRenderConfigs = function (renderDefs) {
        return renderDefs.map(function (renderDef) {
            return {
                node: (!renderDef.selector ? this.node : undefined),
                selector: renderDef.selector,
                config: renderDef.config
            };
        }, this);
    };

    this.fromAttr = function (key) {
        return function () {
            return this.attr[key];
        };
    };

    this.after('initialize', function () {
        this.renderConfigs = this.calculateRenderConfigs(this.renderDefs);
        this.render();
    });
}

var withTemplate = (function () {
    var cache = {};
    return function withTemplate() {
        this.renderTemplate = function (template) {
            cache[template] = (
                cache[template] ||
                document.getElementById('template-' + template).textContent.trim()
            );

            var wrapper = document.createElement('div');
            wrapper.innerHTML = cache[template];
            return wrapper.firstChild;
        };
    };
}());

var makeWithAutoRenderedTemplate = (function () {
    return function (autoRenderTemplate) {
        return function withAutoRenderedTemplate() {
            this.after('initialize', function () {
                this.node.appendChild(
                    this.renderTemplate(autoRenderTemplate)
                );
            });
        };
    };
}());

var withStateLinkedToRender = function () {
    this.after('initialize', function () {
        this.after('setState', this.batchify('render'));
    });
};

function asSingleton(name) {
    var run = false;
    return function singleton() {
        this.before('initialize', function () {
            if (run) {
                throw Error("Already initialized singleton " + name)
            }
            run = true;
            window[name] = this;
        });
    };
}

/**
 * Resources
 */

var resourceRegistry = {};
function withResources() {
    this.resource = function (id) {
        return resourceRegistry[id];
    };

    this.fromResource = function (id) {
        return function () {
            console.log('== fromResource %s ========================', id);
            return resourceRegistry[id];
        };
    };
}
function withProvideResource() {
    this.provideResource = function (id, data) {
        return (resourceRegistry[id] = data);

        return (resourceRegistry[id] = Object.keys(data).reduce(function (result, key) {
            result[key] = (
                typeof data[key] === 'function' ?
                    data[key].bind(instance) :
                    data[key]
            );
            return result;
        }, {}));
    };
}


/**
 * Event and element bindings
 */

function withReferences() {

    this.around('select', function(select, name) {
        if (typeof this.attr[name] != 'undefined') return select(name);
        return this.$node.find("[data-ref=" + name + "]");
    });

}

function withDeclaritiveHandlers() {

    this.handlers = {};

    this.attachDelegatedHandler = function(action, type, handler) {
        if (typeof this.handlers[type] == 'undefined') {
            this.handlers[type] = {};
            this.on(type, flight.utils.delegate(this.handlers[type]));
        }

        this.handlers[type]["[data-action=" + action + "]"] = handler;
    }

    this.createHandler = function(i, node) {
        var actions = $(node).attr('data-action');

        actions.split(';').forEach(function(action) {
            var parts = action.split(':');

            if (parts.length == 1) {
                this.attachDelegatedHandler(action, 'click', this[parts[0]]);
                return;
            }

            this.attachDelegatedHandler(action, parts[0], this[parts[1]]);
        }, this);
    }

    this.after('initialize', function() {
        this.$node.find('[data-action]').each(this.createHandler.bind(this));
    });

}
