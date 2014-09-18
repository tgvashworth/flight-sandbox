'use strict';

var Todos = flight.component(
    withState,
    withChannels,
    makeWithStorage(['todos']),
    asSingleton('todos'),
    function () {
        this.initialState({
            todos: this.fromStorage('todos', [])
        });

        this.after('initialize', function () {
            this.channelOpen('todos', this.channelParamMatchDispatcher);
            this.channelOpen('todos/:id', this.channelArrayParamMatchDispatcher);
            this.channelListen('todos', {}, this.channelPut.bind(this, 'todos/:id'));

            this.on('todoDone', function (e, data) {
                this.setState({
                    todos: this.state.todos.map(function (todo) {
                        if (todo.id === data.id) {
                            todo.done = data.done;
                        }
                        return todo;
                    })
                });
            });
            this.on('todoToggle', function (e, data) {
                this.setState({
                    todos: this.state.todos.map(function (todo) {
                        if (todo.id === data.id) {
                            todo.deleted = data.deleted;
                        }
                        return todo;
                    })
                });
            });
            this.on('todoNew', function (e, data) {
                this.setState({
                    todos: this.state.todos.concat([{
                        text: data.text,
                        id: '' + ~~(Math.random() * 10000),
                        done: data.done,
                        added: Date.now(),
                        deleted: false
                    }])
                });
            });

            this.after('setState', function () {
                this.channelPut('todos', this.state.todos);
            });
            this.after('setState', this.setStorage);
        });
    }
);

var TodoList = flight.component(
    withChannels,
    withTemplate,
    withState,
    withRender,
    withStateLinkedToRender,
    withBatchedUpdates,
    withChildComponents,
    withReferences,
    withDeclarativeHandlers,
    function todoList() {
        this.initialState({
            todos: [],
            rendered: {}
        });

        this.after('initialize', function () {
            this.channelListen('todos', {}, this.toState('todos'), this);
        });

        this.setupRender('todoCounter', {
            text: function () {
                return this.state.todos.reduce(function (sum, todo) {
                    return sum + (todo.done ? 0 : 1);
                }, 0);
            }
        });

        this.after('render', function () {
            console.log('todo list rendered');
            this.state.todos.forEach(this.makeTodo, this);
        });

        this.makeTodo = function (todo) {
            var $node = this.state.rendered[todo.id];
            if ($node) {
                return $node.attr('data-deleted', todo.deleted);
            }
            $node = $(this.renderTemplate('todo-list-item'));
            this.select('list').append($node);
            this.attachChild(TodoItem, $node, todo);
            this.state.rendered[todo.id] = $node;
            this.setState({
                rendered: this.state.rendered
            });
        };

        this.handleCreateTodo = function () {
            var text = this.select('newText').val().trim();
            if (!text) { return; }
            this.trigger('todoNew', {
                text: this.select('newText').val(),
                done: this.select('newDone').prop('checked')
            });
            this.select('newText').focus().val('');
            this.select('newDone').prop('checked', false);
        };

        this.handleKeyPress = function (e) {
            if (e.keyCode === 13) {
                this.handleCreateTodo(e);
            }
        };
    }
);

var TodoItem = flight.component(
    withChannels,
    withTemplate,
    makeWithAutoRenderedTemplate('todo-list-item-content'),
    withState,
    withRender,
    withStateLinkedToRender,
    withBatchedUpdates,
    withReferences,
    withDeclarativeHandlers,
    withTimeout,
    function todoItem() {
        this.attributes({
            id: null,
            text: null,
            done: null,
            added: null,
            deleted: false
        });

        this.initialState({
            done: this.fromAttr('done'),
            text: this.fromAttr('text'),
            added: this.fromAttr('added'),
            deleted: this.fromAttr('deleted')
        });

        this.setupRender({
            attr: {
                'data-ref': this.fromAttr('id'),
                'data-done': this.fromState('done')
            }
        });

        this.setupRender('todoText', {
            text: this.fromState('text')
        });

        this.setupRender('todoDone', {
            attr: {
                checked: this.fromState('done')
            }
        });

        this.setupRender('todoRelativeTime', {
            text: function () {
                return moment(this.state.added).fromNow(true);
            }
        });

        this.after('initialize', function () {
            this.channelListen('todos/:id', { id: this.attr.id }, this.setState, this);
            this.interval('render', 1000 * 30);
            this.after('render', function () {
                console.log('todo item renderd', this.state.text);
            });
        });

        this.handleDoneChanged = function (event) {
            this.trigger('todoDone', {
                id: this.attr.id,
                done: this.select('todoDone').get(0).checked
            });
        };

        this.handleDelete = function (event) {
            this.trigger('todoToggle', {
                id: this.attr.id,
                deleted: true
            });
        };
    }
);
