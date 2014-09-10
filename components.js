var Todos = flight.component(
    withState,
    makeWithProvideResources(['todos']),
    asSingleton('todos'),
    function () {
        this.initialState({
            todos: [
                { id: 'Uda', text: 'Make Flight amazing', done: false },
                { id: 'ctS', text: 'Drink more water', done: true },
                { id: 'LKP', text: 'Think about lunch', done: true },
                { id: 'Fmg', text: 'Have lunch', done: false }
            ]
        });

        this.after('initialize', function () {
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
            this.on('todoNew', function (e, data) {
                this.setState({
                    todos: this.state.todos.concat([{
                        text: data.text,
                        id: '' + ~~(Math.random() * 10000),
                        done: false
                    }])
                });
            });

            this.after('setState', function () {
                this.setResources(this.state);
            });
        });
    }
);

var TodoList = flight.component(
    makeWithResources(['todos']),
    withTemplate,
    withState,
    withRender,
    withStateLinkedToRender,
    withBatchedUpdates,
    withChildComponents,
    withReferences,
    withDeclaritiveHandlers,
    function todoList() {
        this.initialState({
            todos: [],
            rendered: {}
        });

        this.after('initialize', function () {
            this.linkResource('todos', this.toState('todos'));
        });

        this.setupRender('doneCounter', {
            text: function () {
                return this.state.todos.reduce(function (sum, todo) {
                    return sum + (todo.done ? 1 : 0);
                }, 0);
            }
        })

        this.after('render', function () {
            this.state.todos.forEach(this.makeTodo, this);
        });

        this.makeTodo = function (todo) {
            var $node = this.state.rendered[todo.id];
            if (!$node) {
                $node = $(this.renderTemplate('todo-list-item'));
                this.select('list').append($node);
                this.attachChild(TodoItem, $node, todo);
                this.state.rendered[todo.id] = $node;
                this.setState({
                    rendered: this.state.rendered
                });
            }
        };

        this.handleCreateTodo = function () {
            this.trigger('todoNew', {
                text: this.select('newText').val()
            });
            this.select('newText').focus().val('');
        };

        this.handleKeyPress = function (e) {
            if (e.keyCode === 13) {
                this.handleCreateTodo(e);
            }
        };
    }
);

var TodoItem = flight.component(
    makeWithResources(['todos']),
    withTemplate,
    makeWithAutoRenderedTemplate('todo-list-item-content'),
    withState,
    withRender,
    withStateLinkedToRender,
    withBatchedUpdates,
    withReferences,
    withDeclaritiveHandlers,
    function todoItem() {
        this.attributes({
            id: null,
            text: null,
            done: false
        });

        this.initialState({
            done: this.fromAttr('done')
        });

        this.setupRender({
            attr: {
                'data-ref': this.fromAttr('id')
            }
        });

        this.setupRender('todoText', {
            text: this.fromAttr('text')
        });

        this.setupRender('todoDone', {
            attr: {
                checked: this.fromState('done')
            }
        });

        this.after('initialize', function () {
            this.linkResource('todos', function (todos) {
                todos.filter(function (todo) {
                    return (todo.id === this.attr.id);
                }, this).forEach(function (todo) {
                    this.setState(todo)
                }, this);
            });
        });

        this.handleDoneChanged = function (event) {
            this.trigger('todoDone', {
                id: this.attr.id,
                done: event.target.checked
            });
        };
    }
);
