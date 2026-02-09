/**
 * icon-switcher.js
 * Handles switching between Feather Icons and Heroicons.
 */

window.ZyloIcons = {
    // Current provider: 'feather' or 'heroicons'
    provider: localStorage.getItem('icon_provider') || 'feather',
    
    // Cache for loaded SVGs to avoid network requests
    cache: {},

    // Mapping from Feather names to Heroicons v2 names
    // Heroicons v2 uses names like 'arrow-left', 'bars-3', 'pencil', 'trash', 'user'
    map: {
        'activity': 'chart-bar',
        'airplay': 'computer-desktop',
        'alert-circle': 'exclamation-circle',
        'alert-octagon': 'exclamation-triangle',
        'alert-triangle': 'exclamation-triangle',
        'align-center': 'bars-3-bottom-left', // approximation
        'align-justify': 'bars-3-bottom-left',
        'align-left': 'bars-3-bottom-left',
        'align-right': 'bars-3-bottom-right',
        'anchor': 'hashtag',
        'aperture': 'camera', // approximation
        'archive': 'archive-box',
        'arrow-down': 'arrow-down',
        'arrow-down-circle': 'arrow-down-circle',
        'arrow-down-left': 'arrow-down-left',
        'arrow-down-right': 'arrow-down-right',
        'arrow-left': 'arrow-left',
        'arrow-left-circle': 'arrow-left-circle',
        'arrow-right': 'arrow-right',
        'arrow-right-circle': 'arrow-right-circle',
        'arrow-up': 'arrow-up',
        'arrow-up-circle': 'arrow-up-circle',
        'arrow-up-left': 'arrow-up-left',
        'arrow-up-right': 'arrow-up-right',
        'at-sign': 'at-symbol',
        'award': 'trophy',
        'bar-chart': 'chart-bar',
        'bar-chart-2': 'chart-bar',
        'battery': 'battery-50',
        'battery-charging': 'battery-100',
        'bell': 'bell',
        'bell-off': 'bell-slash',
        'bluetooth': 'signal', // approximation
        'bold': 'star', // not available in outline commonly
        'book': 'book-open',
        'book-open': 'book-open',
        'bookmark': 'bookmark',
        'box': 'cube',
        'briefcase': 'briefcase',
        'calendar': 'calendar',
        'camera': 'camera',
        'camera-off': 'camera', // no strike version standard in outline set easily found
        'cast': 'rss',
        'check': 'check',
        'check-circle': 'check-circle',
        'check-square': 'check-badge',
        'chevron-down': 'chevron-down',
        'chevron-left': 'chevron-left',
        'chevron-right': 'chevron-right',
        'chevron-up': 'chevron-up',
        'chevrons-down': 'chevron-double-down',
        'chevrons-left': 'chevron-double-left',
        'chevrons-right': 'chevron-double-right',
        'chevrons-up': 'chevron-double-up',
        'chrome': 'globe-alt',
        'circle': 'stop', // approximation
        'clipboard': 'clipboard',
        'clock': 'clock',
        'cloud': 'cloud',
        'cloud-drizzle': 'cloud',
        'cloud-lightning': 'bolt',
        'cloud-off': 'cloud',
        'cloud-rain': 'cloud',
        'cloud-snow': 'cloud',
        'code': 'code-bracket',
        'codepen': 'cube-transparent',
        'codesandbox': 'cube-transparent',
        'coffee': 'beaker', // closest
        'columns': 'view-columns',
        'command': 'command-line',
        'compass': 'map',
        'copy': 'clipboard-document',
        'corner-down-left': 'arrow-down-left',
        'corner-down-right': 'arrow-down-right',
        'corner-left-down': 'arrow-left',
        'corner-left-up': 'arrow-left',
        'corner-right-down': 'arrow-right',
        'corner-right-up': 'arrow-right',
        'corner-up-left': 'arrow-up-left',
        'corner-up-right': 'arrow-up-right',
        'cpu': 'cpu-chip',
        'credit-card': 'credit-card',
        'crop': 'scissors', // approximation
        'crosshair': 'viewfinder-circle',
        'database': 'server', // closest common use
        'delete': 'backspace',
        'disc': 'circle-stack',
        'dollar-sign': 'currency-dollar',
        'download': 'arrow-down-tray',
        'download-cloud': 'cloud-arrow-down',
        'droplet': 'eye-dropper',
        'edit': 'pencil',
        'edit-2': 'pencil-square',
        'edit-3': 'pencil',
        'external-link': 'arrow-top-right-on-square',
        'eye': 'eye',
        'eye-off': 'eye-slash',
        'facebook': 'globe-alt',
        'fast-forward': 'forward',
        'feather': 'paper-airplane', // ironic
        'figma': 'swatch',
        'file': 'document',
        'file-minus': 'document-minus',
        'file-plus': 'document-plus',
        'file-text': 'document-text',
        'film': 'film',
        'filter': 'funnel',
        'flag': 'flag',
        'folder': 'folder',
        'folder-minus': 'folder-minus',
        'folder-plus': 'folder-plus',
        'framer': 'cube',
        'frown': 'face-frown',
        'gift': 'gift',
        'git-branch': 'share',
        'git-commit': 'stop',
        'git-merge': 'arrows-pointing-in',
        'git-pull-request': 'arrows-right-left',
        'github': 'code-bracket-square', // approximation for brand
        'gitlab': 'cube',
        'globe': 'globe-alt',
        'grid': 'squares-2x2',
        'hard-drive': 'server',
        'hash': 'hashtag',
        'headphones': 'musical-note', 
        'heart': 'heart',
        'help-circle': 'question-mark-circle',
        'hexagon': 'cube',
        'home': 'home',
        'image': 'photo',
        'inbox': 'inbox',
        'info': 'information-circle',
        'instagram': 'camera',
        'italic': 'pencil', // not supported directly usually
        'key': 'key',
        'layers': 'square-3-stack-3d',
        'layout': 'window',
        'life-buoy': 'lifebuoy',
        'link': 'link',
        'link-2': 'link',
        'linkedin': 'user-group',
        'list': 'list-bullet',
        'loader': 'arrow-path',
        'lock': 'lock-closed',
        'log-in': 'arrow-right-on-rectangle', // often inverse
        'log-out': 'arrow-left-on-rectangle',
        'mail': 'envelope',
        'map': 'map',
        'map-pin': 'map-pin',
        'maximize': 'arrows-pointing-out',
        'maximize-2': 'arrows-pointing-out',
        'meh': 'face-smile', // neutral
        'menu': 'bars-3',
        'message-circle': 'chat-bubble-oval-left',
        'message-square': 'chat-bubble-left',
        'mic': 'microphone',
        'mic-off': 'microphone', // strike
        'minimize': 'arrows-pointing-in',
        'minimize-2': 'arrows-pointing-in',
        'minus': 'minus',
        'minus-circle': 'minus-circle',
        'minus-square': 'minus-circle',
        'monitor': 'computer-desktop',
        'moon': 'moon',
        'more-horizontal': 'ellipsis-horizontal',
        'more-vertical': 'ellipsis-vertical',
        'mouse-pointer': 'cursor-arrow-rays',
        'move': 'arrows-pointing-out',
        'music': 'musical-note',
        'navigation': 'paper-airplane',
        'navigation-2': 'paper-airplane',
        'octagon': 'stop',
        'package': 'archive-box',
        'paperclip': 'paper-clip',
        'pause': 'pause',
        'pause-circle': 'pause-circle',
        'pen-tool': 'pencil',
        'percent': 'receipt-percent',
        'phone': 'phone',
        'phone-call': 'phone-arrow-up-right',
        'phone-forwarded': 'phone-arrow-up-right',
        'phone-incoming': 'phone-arrow-down-left',
        'phone-missed': 'phone-x-mark',
        'phone-off': 'phone-x-mark',
        'phone-outgoing': 'phone-arrow-up-right',
        'pie-chart': 'chart-pie',
        'play': 'play',
        'play-circle': 'play-circle',
        'plus': 'plus',
        'plus-circle': 'plus-circle',
        'plus-square': 'plus-circle',
        'pocket': 'archive-box',
        'power': 'power',
        'printer': 'printer',
        'radio': 'radio',
        'refresh-ccw': 'arrow-path',
        'refresh-cw': 'arrow-path',
        'repeat': 'arrow-path',
        'rewind': 'backward',
        'rotate-ccw': 'arrow-uturn-left',
        'rotate-cw': 'arrow-uturn-right',
        'rss': 'rss',
        'save': 'inbox-arrow-down', // or floppy
        'scissors': 'scissors',
        'search': 'magnifying-glass',
        'send': 'paper-airplane',
        'server': 'server',
        'settings': 'cog-6-tooth',
        'share': 'share',
        'share-2': 'share',
        'shield': 'shield-check',
        'shield-off': 'shield-exclamation',
        'shopping-bag': 'shopping-bag',
        'shopping-cart': 'shopping-cart',
        'shuffle': 'arrows-right-left',
        'sidebar': 'adjustments-horizontal', // approx
        'skip-back': 'backward',
        'skip-forward': 'forward',
        'slack': 'chat-bubble-left-right',
        'slash': 'no-symbol',
        'sliders': 'adjustments-horizontal',
        'smartphone': 'device-phone-mobile',
        'smile': 'face-smile',
        'speaker': 'speaker-wave',
        'square': 'stop',
        'star': 'star',
        'stop-circle': 'stop-circle',
        'sun': 'sun',
        'sunrise': 'sun',
        'sunset': 'sun',
        'table': 'table-cells',
        'tablet': 'device-tablet',
        'tag': 'tag',
        'target': 'viewfinder-circle',
        'terminal': 'command-line',
        'thermometer': 'fire', // approx
        'thumbs-down': 'hand-thumb-down',
        'thumbs-up': 'hand-thumb-up',
        'toggle-left': 'stop-circle', // approximation, not exact
        'toggle-right': 'check-circle',
        'tool': 'wrench-screwdriver',
        'trash': 'trash',
        'trash-2': 'trash',
        'trello': 'view-columns',
        'trending-down': 'arrow-trending-down',
        'trending-up': 'arrow-trending-up',
        'triangle': 'play', // often used for play
        'truck': 'truck',
        'tv': 'tv',
        'twitch': 'chat-bubble-oval-left',
        'twitter': 'chat-bubble-left-ellipsis', // bird is gone
        'type': 'language',
        'umbrella': 'sun',
        'underline': 'minus', // not in outline
        'unlock': 'lock-open',
        'upload': 'arrow-up-tray',
        'upload-cloud': 'cloud-arrow-up',
        'user': 'user',
        'user-check': 'user-plus',
        'user-minus': 'user-minus',
        'user-plus': 'user-plus',
        'user-x': 'user-minus',
        'users': 'users',
        'video': 'video-camera',
        'video-off': 'video-camera-slash',
        'voicemail': 'speaker-wave',
        'volume': 'speaker-wave',
        'volume-1': 'speaker-wave',
        'volume-2': 'speaker-wave',
        'volume-x': 'speaker-x-mark',
        'watch': 'clock',
        'wifi': 'wifi',
        'wifi-off': 'wifi', // strike
        'wind': 'cloud',
        'x': 'x-mark',
        'x-circle': 'x-circle',
        'x-octagon': 'x-circle', // approx
        'x-square': 'x-mark',
        'youtube': 'play-circle',
        'zap': 'bolt',
        'zap-off': 'bolt-slash',
        'zoom-in': 'magnifying-glass-plus',
        'zoom-out': 'magnifying-glass-minus'
    },

    init: function() {
        console.log(`Initializing ZyloIcons with provider: ${this.provider}`);
        this.replace();
        
        // Expose settings toggle function
        window.toggleIconProvider = (provider) => {
            this.provider = provider;
            localStorage.setItem('icon_provider', provider);
            // Reload to apply clean state or re-render
            // Ideally we just re-render, but switching libraries might leave artifacts
            location.reload(); 
        };
    },

    replace: function() {
        if (this.provider === 'feather') {
            if (window.feather) {
                window.feather.replace();
            } else {
                setTimeout(() => this.replace(), 100);
            }
        } else if (this.provider === 'heroicons') {
            if (window.heroicons) {
                this.replaceWithHeroicons();
            } else {
                console.warn('heroicons.js not loaded, waiting...');
                setTimeout(() => this.replace(), 100);
            }
        }
    },

    replaceWithHeroicons: function() {
        const elements = document.querySelectorAll('[data-feather]');
        
        for (const element of elements) {
            const featherName = element.getAttribute('data-feather');
            const heroName = this.map[featherName] || featherName;
            
            // Check if already replaced
            if (element.tagName.toLowerCase() === 'svg') continue;

            try {
                const svgInner = this.getHeroiconSvg(heroName);
                if (svgInner) {
                    // Create full SVG element
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    svg.setAttribute('fill', 'none');
                    svg.setAttribute('stroke', 'currentColor');
                    svg.setAttribute('stroke-width', '1.5');
                    svg.setAttribute('stroke-linecap', 'round');
                    svg.setAttribute('stroke-linejoin', 'round');
                    svg.innerHTML = svgInner;
                    
                    // Copy classes and dimensions from original element
                    const originalClasses = element.className;
                    if (originalClasses) {
                        svg.setAttribute('class', originalClasses + ' heroicon heroicon-' + heroName);
                    } else {
                        svg.setAttribute('class', 'heroicon heroicon-' + heroName);
                    }
                    
                    // Preserve width/height if set
                    const w = element.getAttribute('width') || '24';
                    const h = element.getAttribute('height') || '24';
                    svg.setAttribute('width', w);
                    svg.setAttribute('height', h);
                    
                    // Preserve data-feather for future re-renders
                    svg.setAttribute('data-feather', featherName);
                    
                    element.replaceWith(svg);
                }
            } catch (e) {
                console.warn(`Failed to load Heroicon: ${heroName} (mapped from ${featherName})`, e);
            }
        }
    },

    getHeroiconSvg: function(name) {
        // Use the bundled heroicons.js instead of fetching
        if (window.heroicons && window.heroicons.icons && window.heroicons.icons[name]) {
            return window.heroicons.icons[name];
        }
        console.warn(`Heroicon "${name}" not found in bundle`);
        return null;
    }
}

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to ensure DOM is ready and Feather is loaded
    setTimeout(() => {
        ZyloIcons.init();
        
        // Monkey patch feather.replace to use our switcher
        if (window.feather) {
            console.log('Monkey-patching feather.replace for ZyloIcons support');
            const originalReplace = window.feather.replace;
            window.feather.replace = function() {
                if (ZyloIcons.provider === 'feather') {
                    originalReplace.apply(window.feather, arguments);
                } else {
                    ZyloIcons.replaceWithHeroicons();
                }
            };
        }
    }, 10);
});
