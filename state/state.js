var FollowButton = flight.component(
    withState,
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

        this.after('initialize', function () {
            console.log('this.attr', this.attr);
            this.on(document, 'follow-change', this.handleFollowChange)
            this.on('click', this.handleClick);
            this.after('setState', this.update);
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

        this.update = function () {
            this.$node.attr({
                'data-loading': (this.state.loading ? 'loading' : '')
            });
            this.$node.toggleClass('btn-positive', this.state.following)
            this.$node.text(this.state.following ? 'Following' : 'Follow');
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

document.addEventListener('DOMContentLoaded', function () {
    [].slice.call(document.querySelectorAll('[data-component]')).forEach(function (elem) {
        window[elem.dataset.component] && window[elem.dataset.component].attachTo(elem, elem.dataset);
    });
});
