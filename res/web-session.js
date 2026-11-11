(() => {
    "use strict";

    // Leave the iSpring export connected to its LMS when one launched it.
    function hasScormApi(frame) {
        try {
            for (let depth = 0; frame && depth < 255; depth += 1) {
                if (frame.API_1484_11) return true;
                if (frame.parent === frame) break;
                frame = frame.parent;
            }
        } catch {
            // A cross-origin parent or opener cannot expose the SCORM API.
        }
        return false;
    }

    if (hasScormApi(window) || hasScormApi(window.opener)) return;

    // Key by course path so separate GitHub Pages projects have separate progress.
    const storageKey = "ispring-progress:" + new URL(".", location.href).pathname;
    let savedState = "";
    try {
        savedState = localStorage.getItem(storageKey) || "";
    } catch {
        // The course can still run when browser storage is unavailable.
    }

    const values = new Map([
        ["cmi.mode", "normal"],
        ["cmi.suspend_data", savedState],
        ["cmi.interactions._count", "-1"]
    ]);

    function save() {
        const state = values.get("cmi.suspend_data");
        if (state === savedState) return;
        try {
            localStorage.setItem(storageKey, state);
            savedState = state;
        } catch {
            // Keep the current session usable if storage is blocked or full.
        }
    }

    // Implement the calls used by this iSpring SCORM 2004 player.
    window.API_1484_11 = {
        Initialize() {
            return "true";
        },
        GetValue(name) {
            return values.get(name) ?? "";
        },
        SetValue(name, value) {
            values.set(name, String(value));
            return "true";
        },
        Commit() {
            save();
            return "true";
        },
        Terminate() {
            save();
            location.replace(new URL("./data/goodbye.html", location.href));
            return "true";
        }
    };

    window.iSpringWebSession = {
        attach(player) {
            const view = player.view();
            const playback = view.playbackController();

            playback.slideChangeEvent().addHandler(() => {
                requestAnimationFrame(() => {
                    const quiz = playback.quizPlayer();
                    if (!quiz) return;

                    // The embedded quiz can mount without receiving its initial size.
                    const skin = quiz.skin().displayObject();
                    if (skin.style.width && skin.style.height) return;

                    const container = view.displayObject().parentElement;
                    if (container?.clientWidth && container.clientHeight) {
                        quiz.resize(container.clientWidth, container.clientHeight);
                    }
                });
            });
        }
    };
    window.addEventListener("pagehide", save);
})();
