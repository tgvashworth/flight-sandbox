document.addEventListener('DOMContentLoaded', function () {
    [].slice.call(document.querySelectorAll('[data-component]')).forEach(function (elem) {
        window[elem.dataset.component] && window[elem.dataset.component].attachTo(elem, elem.dataset);
    });
});
