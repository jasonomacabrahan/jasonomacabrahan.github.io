/* Jason Omac | site behaviour (vanilla JS, no dependencies) */
(function () {
    'use strict';

    var doc = document;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var hasIO = 'IntersectionObserver' in window;

    function track(name, params) {
        if (typeof window.trackEvent === 'function') window.trackEvent(name, params || {});
    }

    /* ---------------------------------------------------------------
       Header: border once the page leaves the top (no scroll listener)
       --------------------------------------------------------------- */
    var header = doc.getElementById('site-header');
    var sentinel = doc.getElementById('top-sentinel');
    if (header && sentinel && hasIO) {
        new IntersectionObserver(function (entries) {
            header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
        }).observe(sentinel);
    }

    /* ---------------------------------------------------------------
       Mobile navigation
       --------------------------------------------------------------- */
    var toggle = doc.getElementById('nav-toggle');
    var mobileNav = doc.getElementById('mobile-nav');

    function setMenu(open) {
        if (!toggle || !mobileNav) return;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        mobileNav.classList.toggle('is-open', open);
        if (open) mobileNav.removeAttribute('inert');
        else mobileNav.setAttribute('inert', '');
    }
    if (toggle && mobileNav) {
        setMenu(false);
        toggle.addEventListener('click', function () {
            setMenu(toggle.getAttribute('aria-expanded') !== 'true');
        });
        mobileNav.addEventListener('click', function (e) {
            if (e.target.closest('a, button')) setMenu(false);
        });
        doc.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                toggle.focus();
            }
        });
        doc.addEventListener('click', function (e) {
            if (toggle.getAttribute('aria-expanded') === 'true' && !mobileNav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
        });
        window.matchMedia('(min-width: 1101px)').addEventListener('change', function (mq) {
            if (mq.matches) setMenu(false);
        });
    }

    /* ---------------------------------------------------------------
       Active section indicator
       Sections declare which nav item they belong to via data-nav.
       --------------------------------------------------------------- */
    var navLinks = Array.prototype.slice.call(doc.querySelectorAll('.nav-link[data-target]'));
    var tracked = Array.prototype.slice.call(doc.querySelectorAll('[data-nav]'));
    if (navLinks.length && tracked.length && hasIO) {
        var current = null;
        var setActive = function (key) {
            if (key === current) return;
            current = key;
            navLinks.forEach(function (link) {
                if (link.getAttribute('data-target') === key) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
        };
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) setActive(entry.target.getAttribute('data-nav'));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        tracked.forEach(function (section) { sectionObserver.observe(section); });
    }

    /* ---------------------------------------------------------------
       Reveal on scroll (CSS handles the motion; JS only flags visibility)
       --------------------------------------------------------------- */
    var revealables = doc.querySelectorAll('.reveal');
    if (!hasIO || reduceMotion.matches) {
        Array.prototype.forEach.call(revealables, function (el) { el.classList.add('is-visible'); });
    } else {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        Array.prototype.forEach.call(revealables, function (el) { revealObserver.observe(el); });
    }

    /* ---------------------------------------------------------------
       Résumé: prints the hidden résumé block as a PDF
       --------------------------------------------------------------- */
    doc.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-print-resume]');
        if (!trigger) return;
        e.preventDefault();
        track('resume_download', { location: trigger.getAttribute('data-print-resume') || 'page' });
        window.print();
    });

    /* ---------------------------------------------------------------
       Lightbox: any [data-gallery] element opens its gallery set
       --------------------------------------------------------------- */
    var dialog = doc.getElementById('lightbox');
    if (dialog && typeof dialog.showModal === 'function') {
        var lbImg = doc.getElementById('lightbox-img');
        var lbCaption = doc.getElementById('lightbox-caption-text');
        var lbCount = doc.getElementById('lightbox-count');
        var items = [];
        var index = 0;
        var opener = null;

        var collect = function (name) {
            var seen = {};
            return Array.prototype.slice.call(doc.querySelectorAll('[data-gallery="' + name + '"]'))
                .map(function (el) { return { src: el.getAttribute('data-src'), caption: el.getAttribute('data-caption') || '' }; })
                .filter(function (item) {
                    if (!item.src || seen[item.src]) return false;
                    seen[item.src] = true;
                    return true;
                });
        };
        var render = function () {
            var item = items[index];
            lbImg.src = item.src;
            lbImg.alt = item.caption;
            lbCaption.textContent = item.caption;
            lbCount.textContent = items.length > 1 ? (index + 1) + ' of ' + items.length : '';
            dialog.classList.toggle('is-single', items.length < 2);
        };
        var open = function (name, src, trigger) {
            items = collect(name);
            if (!items.length) return;
            index = 0;
            for (var i = 0; i < items.length; i++) { if (items[i].src === src) { index = i; break; } }
            opener = trigger;
            render();
            dialog.showModal();
            track('gallery_open', { gallery: name });
        };
        var step = function (dir) {
            if (items.length < 2) return;
            index = (index + dir + items.length) % items.length;
            render();
        };

        doc.addEventListener('click', function (e) {
            var trigger = e.target.closest('[data-gallery]');
            if (!trigger) return;
            e.preventDefault();
            open(trigger.getAttribute('data-gallery'), trigger.getAttribute('data-src'), trigger);
        });
        doc.getElementById('lb-close').addEventListener('click', function () { dialog.close(); });
        doc.getElementById('lb-prev').addEventListener('click', function () { step(-1); });
        doc.getElementById('lb-next').addEventListener('click', function () { step(1); });
        dialog.addEventListener('click', function (e) {
            if (e.target === dialog || e.target.classList.contains('lightbox-inner') || e.target.classList.contains('lightbox-figure')) dialog.close();
        });
        dialog.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') step(-1);
            else if (e.key === 'ArrowRight') step(1);
        });
        dialog.addEventListener('close', function () {
            lbImg.removeAttribute('src');
            if (opener && typeof opener.focus === 'function') opener.focus();
        });
    }

    /* ---------------------------------------------------------------
       Contact form (Web3Forms). Without JS the form posts normally.
       --------------------------------------------------------------- */
    var form = doc.getElementById('contact-form');
    if (form) {
        form.noValidate = true;
        var statusBox = doc.getElementById('form-status');
        var submitBtn = form.querySelector('button[type="submit"]');
        var submitLabel = submitBtn ? submitBtn.innerHTML : '';

        var messages = {
            name: 'Please enter your name.',
            email: 'Please enter a valid email address.',
            service: 'Please choose what you need help with.',
            message: 'Please add a few details about the project.'
        };

        var fieldOf = function (input) { return input.closest('.field'); };
        var validate = function (input) {
            var field = fieldOf(input);
            if (!field) return true;
            var ok = input.checkValidity();
            field.classList.toggle('has-error', !ok);
            input.setAttribute('aria-invalid', ok ? 'false' : 'true');
            var err = field.querySelector('.field-error');
            if (err) err.textContent = ok ? '' : (messages[input.name] || 'Please check this field.');
            return ok;
        };
        var inputs = Array.prototype.slice.call(form.querySelectorAll('input[required], select[required], textarea[required]'));
        inputs.forEach(function (input) {
            input.addEventListener('blur', function () { if (input.value) validate(input); });
            input.addEventListener('input', function () { if (fieldOf(input).classList.contains('has-error')) validate(input); });
            input.addEventListener('change', function () { if (fieldOf(input).classList.contains('has-error')) validate(input); });
        });

        var showStatus = function (kind, text) {
            statusBox.className = 'form-status ' + (kind === 'success' ? 'is-success' : 'is-error');
            statusBox.textContent = text;
        };

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var firstInvalid = null;
            inputs.forEach(function (input) { if (!validate(input) && !firstInvalid) firstInvalid = input; });
            if (firstInvalid) { firstInvalid.focus(); return; }

            var data = {};
            new FormData(form).forEach(function (value, key) { data[key] = value; });
            var service = data.service || 'General inquiry';
            data.subject = 'Project inquiry: ' + service + (data.name ? ' (' + data.name + ')' : '');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            statusBox.className = 'form-status';

            fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            })
                .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
                .then(function (result) {
                    if (!result.ok || (result.json && result.json.success === false)) throw new Error('submit failed');
                    showStatus('success', 'Thanks, your message is on its way. I will reply by email.');
                    form.reset();
                    inputs.forEach(function (input) { fieldOf(input).classList.remove('has-error'); input.removeAttribute('aria-invalid'); });
                    track('generate_lead', { service: service });
                })
                .catch(function () {
                    showStatus('error', 'Something went wrong while sending. Please try again, or email json7649@gmail.com directly.');
                })
                .then(function () {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitLabel;
                });
        });
    }

    /* ---------------------------------------------------------------
       Footer year
       --------------------------------------------------------------- */
    var year = doc.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
})();
