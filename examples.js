var Button = flight.component(withState, withBatchedUpdates, withRender, withTimeout, function button() {
    this.attributes({
        text: null,
        contentSelector: '.text',
        indicatorSelector: '.indicator'
    });

    this.initialState({
        working: false,
        counter: 0,
        todos: []
    });

    this.setupRender({
        attr: {
            'data-counter': function () {
                return this.state.counter;
            },
            disabled: function () {
                return (this.state.counter % 10 === 0);
            }
        }
    });

    this.setupRender('contentSelector', {
        text: function () {
            return (this.state.working ? 'Working...' : this.attr.text + ' ' + this.state.counter)
        }
    });

    this.setupRender('indicatorSelector', {
        attr: {
            class: function () {
                return [
                    'indicator',
                    (this.state.counter % 3 === 0 ? 'bad' : '')
                ].join(' ');
            }
        }
    });

    this.after('initialize', function () {
        this.on('click', this.batchify('startWorking'));
        this.after('setState', this.batchify('render'));
        this.interval(this.incrementCounter, Math.random() * 500 + 300);
    });

    this.incrementCounter = function () {
        this.setState({
            counter: this.state.counter + 1
        });
    };

    this.startWorking = function (e, data) {
        this.setState({
            working: !this.state.working
        });
    };
});

var Button = flight.component(withRender, withState, withBatchedUpdates, withTimeout, function button() {
    this.attributes({
        text: null,
        actionEvent: 'buttonClicked',
        bgcolor: 'red',
        contentSelector: '.content'
    });

    this.initialState({
        clicks: 0
    });

    this.setupRender({
        attr: {
            'data-action-event': this.fromAttr('actionEvent'),
            'data-clicks': function () {
                return this.state.clicks;
            }
        }
    });

    this.setupRender('contentSelector', {
        text: function () {
            return this.attr.text + ' ' + this.state.clicks
        }
    });

    this.after('initialize', function () {
        this.on('click', this.handleClick);
        this.after('setState', this.batchify('render'));
        this.interval(this.handleClick, Math.random () * 300 + 300);
    });

    this.handleClick = function () {
        this.setState({
            clicks: this.state.clicks + 1
        })
    };
});
