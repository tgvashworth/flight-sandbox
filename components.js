var Todos = flight.component(
    withState,
    withProvideResource,
    withResources,
    asSingleton('todos'),
    function () {
        this.initialState({
            todos: [
                { text: 'Make Flight amazing', done: false },
                { text: 'Drink more water', done: true },
                { text: 'Think about lunch', done: true },
                { text: 'Have lunch', done: false }
            ]
        });

        this.after('initialize', function () {
            this.provideResource('todos', this.state.todos);

            this.on('uiCreateTodo', function (e, todo) {
                this.setState({
                    todos: this.state.todos.concat([todo])
                });
            });

            this.after('setState', function () {
                this.provideResource('todos', this.state.todos);
                this.trigger('todos-changed');
            });
        });
    }
);

var TodoList = flight.component(
    withTemplate,
    withState,
    withBatchedUpdates,
    withChildComponents,
    withResources,
    function todoList() {
        this.attributes({
            listSelector: 'ul',
            createTodoSelector: '.todo-list__create',
            newTodoTextSelector: '.todo-list__new-text',
        });

        this.initialState({
            todos: this.fromResource('todos')
        });

        this.after('initialize', function () {
            this.on('click', {
                createTodoSelector: this.handleCreateTodo
            });

            this.on(document, 'todos-changed', function (e) {
                this.setState({
                    todos: this.resource('todos')
                });
            });

            this.after('setState', this.batchify(this.render));
        });

        this.handleCreateTodo = function (e) {
            this.trigger('uiCreateTodo', {
                text: this.select('newTodoTextSelector').val()
            });
        };

        this.render = function () {
            this.trigger(this.childTeardownEvent);
            this.select('listSelector').html('');
            this.state.todos.forEach(this.addTodoItem, this);
        };

        this.addTodoItem = function (todo) {
            var node = this.renderTemplate('todo-list-item');
            this.select('listSelector').append(node);
            this.attachChild(TodoItem, node, todo);
        };
    }
);

var TodoItem = flight.component(
    withTemplate,
    makeWithAutoRenderedTemplate('todo-list-item-content'),
    withState,
    withRender,
    withStateLinkedToRender,
    withBatchedUpdates,
    function todoItem() {
        this.attributes({
            text: null,
            done: false,
            textSelector: '.todo-list-item-content__text',
            checkboxSelector: '.todo-list-item-content__done'
        });

        this.initialState({
            done: this.fromAttr('done')
        });

        this.setupRender('textSelector', {
            text: this.fromAttr('text')
        });

        this.setupRender('checkboxSelector', {
            attr: {
                checked: this.fromState('done')
            }
        });

        this.after('initialize', function () {
            this.on('change', {
                checkboxSelector: this.handleClick
            });
        });

        this.handleClick = function (event) {
            this.setState({
                done: event.target.checked
            });
        };
    }
);
