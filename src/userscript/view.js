/* global ADBLOCKRECOVERYSTYLE */
import {$on, $delegate, qsa, qs, appendCSS} from '../common/js/helpers';
import logs from '../common/js/logs';

import Urls from '../_data/urls.json';

import {chromeRuntimeSend} from './chrome.runtime';

export default class View {
    constructor(template) {
        this.template = template;

        $on(document, 'click', this.closeLinksStatus);
        $delegate(document, '.adblock-recovery-status', 'click', ({target}) => {
            this.closeLinksStatus();
            this.showLinkStatus(target);
        }, true);
        $delegate(document, '.adblock-recovery-status-close', 'click', () => {
            this.closeLinksStatus();
        }, true);
    }

    /**
     * opening popup with information about the link
     *
     * @param {Object} target   current link element
     */
    showLinkStatus(target) {
        const _this = this;
        target.classList.add('adblock-recovery-status-show');

        let rect = this.getOffsetRect(target);

        const iframe = document.createElement('iframe');
        iframe.setAttribute('class', 'adblock-recovery-status-iframe');
        iframe.setAttribute('frameBorder', 0);
        iframe.setAttribute('width', 350);
        iframe.setAttribute('allowTransparency', 'true');

        this.moveElementTo(iframe, rect.left, rect.top);

        let iframeAlreadyLoaded = false;

        iframe.onload = function() {
            if (iframeAlreadyLoaded) {
                //IE calls load each time when we use document.close
                return;
            }
            iframeAlreadyLoaded = true;
            let status = Urls.data.find((link) => {
                return target.parentNode.getAttribute('data-href').indexOf(link.domain) >= 0 || target.parentNode.getAttribute('data-href-alt').indexOf(link.domain) >= 0;
            });
            const content = _this.template.linkStatus(status);
            _this.appendContentToIframe(iframe, content, target.parentNode.getAttribute('data-href'));

            $delegate(document, '.adblock-recovery-status-close', 'click', () => {
                _this.closeLinksStatus();
            }, true);
        };

        document.body.appendChild(iframe);
    }

    /**
     * write the content in the iframe
     *
     * @param {Object} iframe   current iframe
     * @param {String} content   content
     */
    appendContentToIframe(iframe, content, href) {
        const _this = this;
        try {
            const doc = iframe.contentDocument;

            // ADBLOCKRECOVERYSTYLE - global styles string which created by the gulp
            const style = '<style type="text/css">' + ADBLOCKRECOVERYSTYLE + '</style>';
            doc.open();
            doc.write('<html><head>' + style + '</head><body class="adblock-recovery-status-body">' + content + '</body></html>');
            doc.close();
            iframe.style.setProperty('display', 'block', 'important');

            // setting iframe height dynamically based on inner content
            iframe.setAttribute('height', iframe.contentWindow.document.body.scrollHeight || 370);

            $delegate(doc, '.adblock-recovery-status-close', 'click', () => {
                _this.closeLinksStatus();
            }, true);

            $delegate(doc, '.adblock-recovery-status-readmod', 'click', () => {
                // `location` variable is like document.location
                let location = {
                    href: href
                };


                const readmodBlock = document.createElement('div');
                const closeBtn = document.createElement('button');
                readmodBlock.setAttribute('class', 'adblock-recovery-readmode');
                closeBtn.setAttribute('class', 'adblock-recovery-readmode-close');
                readmodBlock.appendChild(closeBtn);
                document.body.appendChild(readmodBlock);
                _this.gettingContentForReadMode(location);


                // let fram = document.createElement('iframe');
                // fram.setAttribute('src', 'chrome-extension://gmeabhofhmlffbbpohfmfcknihdpgffh/readmode.html?url=https://cnews.ru/');

                // document.body.appendChild(fram);
            }, true);
        } catch (ex) {
            logs.error(ex);
        }
    }

    /**
     * closing popup with information about the link
     */
    closeLinksStatus() {
        let frame = qs('.adblock-recovery-status-iframe');
        if (frame) {
            frame.remove();
            frame = null;
        }
        qsa('.adblock-recovery-status-show').forEach((e) => {
            e.classList.remove('adblock-recovery-status-show');
        });
    }

    getOffsetRect(elem) {
        const box = elem.getBoundingClientRect();

        const body = document.body;
        const docElem = document.documentElement;

        const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
        const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

        const clientTop = docElem.clientTop || body.clientTop || 0;
        const clientLeft = docElem.clientLeft || body.clientLeft || 0;

        let top = box.top + scrollTop - clientTop;
        let left = box.left + scrollLeft - clientLeft;

        return {
            top: Math.round(top),
            left: Math.round(left)
        };
    }

    /**
     * Set transition css property for drag
     * translate3d is for better rendering performance
     * see: https://www.html5rocks.com/en/tutorials/speed/layers/
     */
    moveElementTo(el, x, y) {
        let transform = 'translate3d(' + x + 'px,' + y + 'px, 0px)';
        el.style.webkitTransform = transform;
        el.style.mozTransform = transform;
        el.style.msTransform = transform;
        el.style.oTransform = transform;
        el.style.transform = transform;
    }

    gettingContentForReadMode(location) {
        chromeRuntimeSend({
            from: 'content',
            subject: 'readmode',
            location: location
        });
    }

    /*
     * Inserting readmode modal
     */
    openInReadmod(responseText) {
        const _this = this;
        let allredyDef = qs('.adblock-recovery-readmode > iframe');

        let content = new DOMParser().parseFromString(responseText, 'text/html');

        // remove scripts, styles, images
        let elements = qsa('script, link, noscript, style, img, form, input, button, textarea', content);

        for (let index = elements.length - 1; index >= 0; index--) {
            elements[index].parentNode.removeChild(elements[index]);
        }

        // remove inline styles
        let inlineStyles = qsa('[style]', content);

        for (let index = inlineStyles.length - 1; index >= 0; index--) {
            inlineStyles[index].removeAttribute('style');
        }

        let readmodBlock = qs('.adblock-recovery-readmode');
        let closeBtn = qs('.adblock-recovery-readmode-close', readmodBlock);
        let iframe;

        if (!allredyDef) {
            iframe = document.createElement('iframe');
            $on(closeBtn, 'click', this.closeReadMod);
            readmodBlock.appendChild(iframe);

            // TODO: take out attributes
            iframe.setAttribute('frameBorder', 0);
            iframe.setAttribute('allowTransparency', 'false');
        } else {
            iframe = allredyDef;
            iframe.contentDocument.body.scrollTop = 0;
        }

        try {
            const doc = iframe.contentDocument;
            const style = '<style type="text/css">body {position: relative;font: 16px/1.625 "Open Sans",Arial,sans-serif;color: #262626;}a{color:#68BC71;text-decoration: underline;outline: 0;}</style>';
            doc.open();
            doc.write(
                `<html><head> ${style} </head><body><div class="options"><div class="container"> ${content.body.outerHTML} </div></div></body></html>`
            );
            doc.close();
            iframe.style.setProperty('display', 'block', 'important');

            $delegate(doc, 'a', 'click', (e) => {
                let location = {
                    href: e.target.href
                };
                e.preventDefault();
                e.stopPropagation();
                iframe.style.setProperty('display', 'none', 'important');
                _this.gettingContentForReadMode(location);
            }, true);
        } catch (ex) {
            logs.error(ex);
        }



        if (!qs('#adblock-recovery-styles')) {
            appendCSS(ADBLOCKRECOVERYSTYLE, null, 'adblock-recovery-styles');
        }
    }

    closeReadMod() {
        let readmodBlock = qs('.adblock-recovery-readmode');

        if (readmodBlock) {
            readmodBlock.remove();
            readmodBlock = null;
        }
    }
}