var FollowButton = flight.component(
    withState,
    withRender,
    withBatchedUpdates,
    function () {
        this.attributes({
            id: null,
            following: false
        });

        this.initialState({
            following: function () {
                return (this.attr.following !== false);
            },
            loading: false
        });

        this.setupRender({
            attr: {
                'data-loading': function () {
                    return (this.state.loading ? 'loading' : '')
                }
            },
            toggleClass: ['btn-positive', this.fromState('following')],
            text: function () {
                return (this.state.following ? 'Following' : 'Follow');
            }
        })

        this.after('initialize', function () {
            this.on(document, 'follow-change', this.handleFollowChange)
            this.on('click', this.handleClick);
            this.after('setState', this.batchify('render'));
        });

        this.handleFollowChange = function (e, data) {
            if (data.id != this.attr.id) return;
            this.setState({
                loading: false,
                following: data.following
            });
        };

        this.handleClick = function (e) {
            if (this.state.loading) return;
            this.setState({
                loading: true
            });
            this.trigger('follow', {
                id: this.attr.id,
                follow: !this.state.following
            });
        };
    }
);

$(document).on('follow', function (e, data) {
    console.log('== follow ========================');
    console.log('data', data);
    setTimeout(function () {
        $(document).trigger('follow-change', {
            id: data.id,
            following: data.follow
        });
    }, 500);
});
