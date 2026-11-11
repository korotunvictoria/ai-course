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

    const quizOutlines = new WeakMap();

    window.iSpringWebSession = {
        connectQuizOutline(quiz, openOutline) {
            const skin = quiz.skin().displayObject();
            if (!quizOutlines.has(skin)) {
                skin.addEventListener("click", event => {
                    const outline = skin.querySelector(".quiz-control-panel__container_left button");
                    if (!outline?.contains(event.target)) return;

                    event.stopImmediatePropagation();
                    quizOutlines.get(skin)();
                }, true);
            }
            quizOutlines.set(skin, openOutline);
        },
        attach(player) {
            const view = player.view();
            const playback = view.playbackController();
            let activeContainer;

            function layoutQuiz() {
                const quiz = playback.quizPlayer();
                const skin = quiz?.skin().displayObject();
                const container = skin?.closest(".universal_mini, .universal");

                if (activeContainer !== container) {
                    activeContainer?.classList.remove("web-quiz-active");
                    resizeObserver.disconnect();
                    activeContainer = container;
                    activeContainer?.classList.add("web-quiz-active");
                    if (activeContainer) resizeObserver.observe(activeContainer);
                }

                if (container?.matches(".universal")) {
                    // Use the entire desktop player, above its slide area and below its popups.
                    if (skin.parentElement !== container) {
                        container.insertBefore(skin, container.querySelector(":scope > .popups-layer"));
                    }
                    quiz.resize(container.clientWidth, container.clientHeight);
                } else if (container) {
                    quiz.resize(document.documentElement.clientWidth, window.innerHeight);
                }
            }

            const scheduleLayout = () => requestAnimationFrame(layoutQuiz);
            const resizeObserver = new ResizeObserver(scheduleLayout);
            playback.slideChangeEvent().addHandler(scheduleLayout);
            window.addEventListener("resize", scheduleLayout);
            scheduleLayout();
        }
    };
    window.addEventListener("pagehide", save);
})();
