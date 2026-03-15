(function () {
  if (window.__leadOSMounted) return;
  window.__leadOSMounted = true;

  var config = Object.assign(
    {
      runtimeBaseUrl: "https://leados.yourdeputy.com",
      service: "lead-capture",
      niche: "plumbing",
      family: "qualification",
      launcherLabel: "Need help now?",
      accent: "#c4632d",
      secondary: "#225f54",
      surface: "#fffaf2",
      text: "#14211d",
      mode: null
    },
    window.LeadOSConfig || {}
  );

  if (!config.runtimeBaseUrl) return;

  var bootState = {
    brandName: "LeadOS",
    supportHref: "mailto:support@example.com",
    experience: null,
    channels: {
      chat: false,
      email: true,
      sms: false,
      voice: false,
      whatsapp: false
    },
    embed: {
      launcherLabel: config.launcherLabel,
      drawerTitle: "Get the right next step",
      drawerSummary: "Capture and route this visitor into the hosted lead engine."
    }
  };

  var state = {
    isOpen: false,
    isSubmitting: false,
    submitted: false,
    result: null,
    step: 1,
    goalId: "",
    firstName: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    error: "",
    lastFocusedElement: null
  };

  function absoluteUrl(path) {
    if (!path) return config.runtimeBaseUrl;
    if (/^https?:\/\//i.test(path)) return path;
    return config.runtimeBaseUrl.replace(/\/$/, "") + path;
  }

  function create(tag, attrs, text) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "style") {
        Object.assign(el.style, attrs.style);
      } else if (key === "className") {
        el.className = attrs[key];
      } else if (key === "dataset") {
        Object.keys(attrs.dataset).forEach(function (dataKey) {
          el.dataset[dataKey] = attrs.dataset[dataKey];
        });
      } else if (key === "html") {
        el.innerHTML = attrs[key];
      } else if (attrs[key] !== undefined && attrs[key] !== null) {
        el.setAttribute(key, attrs[key]);
      }
    });
    if (text !== undefined && text !== null) {
      el.textContent = text;
    }
    return el;
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function encodeQuery(params) {
    var search = new URLSearchParams();
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    });
    return search.toString();
  }

  function getExperience() {
    if (bootState.experience && bootState.experience.defaults) {
      return bootState.experience.defaults;
    }

    return {
      family: config.family || "qualification",
      mode: config.mode || "booking-first",
      heroTitle: "Get the right next step",
      heroSummary: "Capture urgent demand quickly and route it into booking, dispatch, or follow-up.",
      trustPromise: "Fast routing, clear next steps, and a human fallback stay available.",
      secondaryActionHref: "mailto:support@example.com",
      secondaryActionLabel: "Talk to a human",
      proofSignals: [
        "Fast routing",
        "Human fallback",
        "Hosted handoff",
        "Multi-step qualification"
      ],
      discoveryPrompt: "What do you need first?",
      discoveryOptions: [
        {
          id: "dispatch-now",
          label: "Get help fast",
          description: "Shorten the path to dispatch or booking.",
          signals: { wantsBooking: true }
        },
        {
          id: "estimate",
          label: "Book an estimate",
          description: "Start with a clearer quote or scheduling path.",
          signals: { wantsBooking: true, contentEngaged: true }
        },
        {
          id: "talk",
          label: "Talk to a human",
          description: "Use a guided path when the job is unusual.",
          signals: { prefersChat: true }
        }
      ],
      progressSteps: [
        { label: "Goal", detail: "Choose the fastest useful path." },
        { label: "Contact", detail: "Share just enough to keep context." },
        { label: "Next step", detail: "We route into the best hosted action." }
      ],
      returnOffer: "If the visitor is not ready now, keep the follow-up path light."
    };
  }

  function hostedHref() {
    var query = encodeQuery({
      niche: config.niche,
      family: (getExperience().family || config.family || "qualification"),
      mode: config.mode || getExperience().mode || undefined,
      source: "embedded_widget"
    });
    return absoluteUrl("/?" + query);
  }

  function setStep(value) {
    state.step = Math.max(1, Math.min(3, value));
    render();
  }

  function closePanel() {
    state.isOpen = false;
    panel.hidden = true;
    overlay.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
      state.lastFocusedElement.focus();
    } else {
      launcher.focus();
    }
  }

  function openPanel() {
    state.lastFocusedElement = document.activeElement;
    state.isOpen = true;
    overlay.hidden = false;
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    render();
    window.setTimeout(function () {
      var firstFocusable = panel.querySelector("button, a, input, textarea");
      if (firstFocusable && typeof firstFocusable.focus === "function") {
        firstFocusable.focus();
      }
    }, 0);
  }

  function buildHeaders() {
    return {
      "Content-Type": "application/json"
    };
  }

  function postLead() {
    var experience = getExperience();
    state.isSubmitting = true;
    state.error = "";
    render();

    return fetch(absoluteUrl("/api/intake"), {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        source: "embedded_widget",
        firstName: state.firstName,
        email: state.email,
        phone: normalizePhone(state.phone) || undefined,
        company: state.company || undefined,
        service: config.service,
        niche: config.niche,
        page: window.location.pathname,
        message: state.notes || undefined,
        website: "",
        metadata: {
          origin: window.location.origin,
          path: window.location.pathname,
          title: document.title,
          goalId: state.goalId,
          interactionMode: config.mode || experience.mode || "booking-first",
          embedded: true
        },
        wantsBooking: state.goalId === "dispatch-now" || state.goalId === "estimate",
        prefersChat: state.goalId === "talk",
        preferredFamily: experience.family || config.family || "qualification"
      })
    }).then(function (response) {
      return response.json().then(function (payload) {
        return { ok: response.ok, payload: payload };
      });
    }).then(function (result) {
      state.isSubmitting = false;
      if (!result.ok || !result.payload || !result.payload.success) {
        state.error = (result.payload && result.payload.error) || "We could not save this request just now.";
        render();
        return;
      }

      state.submitted = true;
      state.result = result.payload;
      render();
    }).catch(function () {
      state.isSubmitting = false;
      state.error = "We could not reach LeadOS just now.";
      render();
    });
  }

  function requestBoot() {
    return fetch(absoluteUrl("/api/widgets/boot"), {
      headers: {
        Accept: "application/json"
      }
    }).then(function (response) {
      if (!response.ok) throw new Error("boot");
      return response.json();
    }).then(function (payload) {
      if (!payload || !payload.success || !payload.widget) return;

      var widget = payload.widget;
      var nextDefaults = widget.defaults || {};
      var embed = widget.embed || {};

      config.service = config.service || nextDefaults.service || "lead-capture";
      config.niche = config.niche || nextDefaults.niche || "plumbing";
      bootState.brandName = widget.brandName || bootState.brandName;
      bootState.experience = widget.experience || bootState.experience;
      bootState.channels = widget.channels || bootState.channels;
      bootState.embed = {
        launcherLabel: embed.launcherLabel || bootState.embed.launcherLabel,
        drawerTitle: embed.drawerTitle || bootState.embed.drawerTitle,
        drawerSummary: embed.drawerSummary || bootState.embed.drawerSummary
      };

      var experience = getExperience();
      bootState.supportHref = experience.secondaryActionHref || bootState.supportHref;
      if (!state.goalId && experience.discoveryOptions && experience.discoveryOptions[0]) {
        state.goalId = experience.discoveryOptions[0].id;
      }

      launcherLabel.textContent = bootState.embed.launcherLabel;
      render();
    }).catch(function () {
      var experience = getExperience();
      if (!state.goalId && experience.discoveryOptions && experience.discoveryOptions[0]) {
        state.goalId = experience.discoveryOptions[0].id;
      }
      render();
    });
  }

  function buildStepRail(experience) {
    return experience.progressSteps.map(function (item, index) {
      var current = index + 1 === state.step;
      var complete = index + 1 < state.step;
      return (
        '<li class="' + (current ? "current" : complete ? "complete" : "") + '">' +
          '<span>' + (index + 1) + "</span>" +
          "<div><strong>" + item.label + "</strong><small>" + item.detail + "</small></div>" +
        "</li>"
      );
    }).join("");
  }

  function buildOptions(experience) {
    return experience.discoveryOptions.map(function (option) {
      var checked = state.goalId === option.id;
      return (
        '<label class="leados-choice' + (checked ? " selected" : "") + '">' +
          '<input type="radio" name="leados-goal" value="' + option.id + '"' + (checked ? " checked" : "") + " />" +
          "<strong>" + option.label + "</strong>" +
          "<span>" + option.description + "</span>" +
        "</label>"
      );
    }).join("");
  }

  function bindInteractiveHandlers() {
    var goalInputs = panel.querySelectorAll('input[name="leados-goal"]');
    goalInputs.forEach(function (input) {
      input.addEventListener("change", function (event) {
        state.goalId = event.target.value;
        render();
      });
    });

    var nextButton = panel.querySelector("[data-action='next']");
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        if (state.step === 1 && !state.goalId) {
          state.error = "Choose the fastest useful path first.";
          render();
          return;
        }
        if (state.step === 2) {
          if (!state.firstName.trim()) {
            state.error = "Add a first name so the next step feels personal.";
            render();
            return;
          }
          if (!state.email.trim()) {
            state.error = "Add an email so we can confirm the next step.";
            render();
            return;
          }
        }
        state.error = "";
        setStep(state.step + 1);
      });
    }

    var backButton = panel.querySelector("[data-action='back']");
    if (backButton) {
      backButton.addEventListener("click", function () {
        state.error = "";
        setStep(state.step - 1);
      });
    }

    var submitButton = panel.querySelector("[data-action='submit']");
    if (submitButton) {
      submitButton.addEventListener("click", function () {
        postLead();
      });
    }

    var closeButton = panel.querySelector("[data-action='close']");
    if (closeButton) {
      closeButton.addEventListener("click", closePanel);
    }

    var fields = panel.querySelectorAll("[data-field]");
    fields.forEach(function (field) {
      field.addEventListener("input", function (event) {
        var name = event.target.getAttribute("data-field");
        state[name] = event.target.value;
      });
    });
  }

  function renderStep(experience) {
    if (state.submitted && state.result) {
      var nextStep = state.result.nextStep || {};
      return (
        '<div class="leados-status success" role="status">' +
          "<h3>Your next step is ready</h3>" +
          "<p>" + (nextStep.message || "LeadOS saved the request and prepared the next move.") + "</p>" +
          '<div class="leados-row">' +
            '<a class="leados-primary" href="' + absoluteUrl(nextStep.destination || "/") + '">' + (nextStep.ctaLabel || "Continue") + "</a>" +
            '<a class="leados-secondary" href="' + bootState.supportHref + '">' + (experience.secondaryActionLabel || "Talk to a human") + "</a>" +
          "</div>" +
        "</div>"
      );
    }

    if (state.step === 1) {
      return (
        '<div class="leados-step">' +
          "<h3>" + experience.discoveryPrompt + "</h3>" +
          '<div class="leados-options">' + buildOptions(experience) + "</div>" +
        "</div>"
      );
    }

    if (state.step === 2) {
      return (
        '<div class="leados-step">' +
          "<h3>Where should we confirm the next step?</h3>" +
          '<div class="leados-form-grid">' +
            '<label><span>First name</span><input data-field="firstName" autocomplete="given-name" value="' + escapeHtml(state.firstName) + '" /></label>' +
            '<label><span>Email</span><input data-field="email" type="email" autocomplete="email" inputmode="email" value="' + escapeHtml(state.email) + '" /></label>' +
            '<label><span>Phone</span><input data-field="phone" type="tel" autocomplete="tel" inputmode="tel" value="' + escapeHtml(state.phone) + '" /></label>' +
            '<label><span>Company</span><input data-field="company" autocomplete="organization" value="' + escapeHtml(state.company) + '" /></label>' +
            '<label class="full"><span>Notes</span><textarea data-field="notes" rows="4">' + escapeHtml(state.notes) + "</textarea></label>" +
          "</div>" +
        "</div>"
      );
    }

    var selectedGoal = (experience.discoveryOptions || []).filter(function (option) {
      return option.id === state.goalId;
    })[0];

    return (
      '<div class="leados-step">' +
        "<h3>Confirm the fastest useful path</h3>" +
        '<div class="leados-review-grid">' +
          '<article class="leados-review-card"><span class="eyebrow">Chosen path</span><strong>' + escapeHtml(selectedGoal ? selectedGoal.label : "Next step") + "</strong><p>" + escapeHtml(selectedGoal ? selectedGoal.description : "") + "</p></article>" +
          '<article class="leados-review-card"><span class="eyebrow">What happens next</span><strong>' + escapeHtml(experience.primaryActionLabel || "Continue") + "</strong><p>" + escapeHtml(experience.returnOffer || "") + "</p></article>" +
        "</div>" +
      "</div>"
    );
  }

  function render() {
    var experience = getExperience();
    var errorHtml = state.error
      ? '<div class="leados-status error" role="alert">' + escapeHtml(state.error) + "</div>"
      : "";

    var actionsHtml;
    if (state.submitted) {
      actionsHtml = "";
    } else {
      var left = state.step > 1
        ? '<button type="button" class="leados-secondary" data-action="back">Back</button>'
        : '<a class="leados-secondary" href="' + hostedHref() + '" target="_blank" rel="noreferrer">Open full experience</a>';
      var right = state.step < 3
        ? '<button type="button" class="leados-primary" data-action="next">Continue</button>'
        : '<button type="button" class="leados-primary" data-action="submit"' + (state.isSubmitting ? " disabled" : "") + ">" + (state.isSubmitting ? "Saving..." : "Save and continue") + "</button>";
      actionsHtml = '<div class="leados-row">' + left + right + "</div>";
    }

    panel.innerHTML =
      '<div class="leados-shell">' +
        '<div class="leados-toolbar">' +
          '<span class="leados-badge">' + escapeHtml(bootState.brandName) + "</span>" +
          '<button type="button" class="leados-close" data-action="close" aria-label="Close LeadOS panel">x</button>' +
        "</div>" +
        "<h2>" + escapeHtml(bootState.embed.drawerTitle) + "</h2>" +
        '<p class="leados-summary">' + escapeHtml(bootState.embed.drawerSummary) + "</p>" +
        '<ul class="leados-step-rail">' + buildStepRail(experience) + "</ul>" +
        '<div class="leados-proof-row">' + (experience.proofSignals || []).slice(0, 3).map(function (signal) {
          return '<span class="leados-proof-pill">' + escapeHtml(signal) + "</span>";
        }).join("") + "</div>" +
        renderStep(experience) +
        errorHtml +
        actionsHtml +
      "</div>";

    bindInteractiveHandlers();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function injectStyles() {
    if (document.getElementById("lead-os-embed-styles")) return;
    var style = create("style", { id: "lead-os-embed-styles" });
    style.textContent = [
      ":root{--leados-accent:" + config.accent + ";--leados-secondary:" + config.secondary + ";--leados-surface:" + config.surface + ";--leados-text:" + config.text + ";}",
      "#lead-os-embed-overlay{position:fixed;inset:0;background:rgba(10,15,14,.34);z-index:2147483645;backdrop-filter:blur(6px);}",
      "#lead-os-embed-panel{position:fixed;right:20px;bottom:20px;width:min(430px,calc(100vw - 24px));max-height:min(88vh,820px);overflow:auto;z-index:2147483646;background:linear-gradient(180deg,rgba(255,250,243,.98),rgba(255,246,237,.97));color:var(--leados-text);border:1px solid rgba(20,33,29,.1);border-radius:28px;box-shadow:0 28px 70px rgba(16,21,19,.24);font-family:\"Trebuchet MS\",\"Gill Sans\",\"Helvetica Neue\",sans-serif;}",
      "#lead-os-embed-panel[hidden],#lead-os-embed-overlay[hidden]{display:none;}",
      "#lead-os-embed-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483647;display:inline-flex;align-items:center;gap:10px;min-height:60px;padding:14px 18px;border:0;border-radius:999px;background:var(--leados-accent);color:#fffaf4;box-shadow:0 18px 36px rgba(196,99,45,.28);font-weight:800;cursor:pointer;}",
      "#lead-os-embed-launcher:hover{filter:brightness(.96);transform:translateY(-1px);}",
      "#lead-os-embed-launcher:focus-visible,#lead-os-embed-panel button:focus-visible,#lead-os-embed-panel a:focus-visible,#lead-os-embed-panel input:focus-visible,#lead-os-embed-panel textarea:focus-visible{outline:3px solid #0f5fff;outline-offset:3px;}",
      ".leados-launcher-mark{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.16);font-size:13px;}",
      ".leados-shell{display:grid;gap:16px;padding:22px;}",
      ".leados-toolbar,.leados-row,.leados-proof-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}",
      ".leados-toolbar{justify-content:space-between;}",
      ".leados-badge{display:inline-flex;align-items:center;min-height:34px;padding:8px 12px;border-radius:999px;background:rgba(34,95,84,.1);color:#194439;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;}",
      ".leados-close{width:40px;height:40px;border-radius:999px;border:1px solid rgba(20,33,29,.12);background:rgba(255,255,255,.76);cursor:pointer;}",
      "#lead-os-embed-panel h2,#lead-os-embed-panel h3{margin:0;font-family:\"Palatino Linotype\",\"Book Antiqua\",Georgia,serif;line-height:1.05;}",
      "#lead-os-embed-panel h2{font-size:clamp(2rem,4vw,2.8rem);}",
      "#lead-os-embed-panel h3{font-size:1.28rem;}",
      ".leados-summary{margin:0;color:#385145;line-height:1.58;}",
      ".leados-step-rail{display:grid;gap:10px;padding-left:0;list-style:none;margin:0;}",
      ".leados-step-rail li{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:18px;background:rgba(34,95,84,.08);}",
      ".leados-step-rail li span{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:rgba(20,33,29,.1);font-weight:800;flex:none;}",
      ".leados-step-rail li.current{background:rgba(196,99,45,.12);}",
      ".leados-step-rail li.current span,.leados-step-rail li.complete span{background:var(--leados-accent);color:#fff;}",
      ".leados-step-rail strong,.leados-step-rail small{display:block;}",
      ".leados-step-rail small{margin-top:3px;color:#51675d;}",
      ".leados-proof-pill{display:inline-flex;align-items:center;min-height:34px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.72);border:1px solid rgba(20,33,29,.08);font-size:13px;color:#1c3f37;}",
      ".leados-step{display:grid;gap:14px;}",
      ".leados-options{display:grid;gap:12px;}",
      ".leados-choice{display:grid;gap:6px;padding:16px;border:1px solid rgba(20,33,29,.1);border-radius:20px;background:rgba(255,255,255,.72);cursor:pointer;}",
      ".leados-choice.selected{background:rgba(255,247,238,.96);border-color:rgba(196,99,45,.34);box-shadow:0 14px 28px rgba(196,99,45,.12);}",
      ".leados-choice input{margin:0;}",
      ".leados-choice strong{font-size:1rem;}",
      ".leados-choice span{color:#496055;line-height:1.5;}",
      ".leados-form-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}",
      ".leados-form-grid label{display:grid;gap:7px;font-weight:700;}",
      ".leados-form-grid label span{font-size:14px;}",
      ".leados-form-grid input,.leados-form-grid textarea{width:100%;min-height:50px;padding:14px 15px;border-radius:16px;border:1px solid rgba(20,33,29,.12);background:#fffefb;color:var(--leados-text);font:inherit;}",
      ".leados-form-grid textarea{min-height:120px;resize:vertical;}",
      ".leados-form-grid .full{grid-column:1 / -1;}",
      ".leados-review-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}",
      ".leados-review-card{display:grid;gap:8px;padding:16px;border-radius:20px;background:rgba(255,255,255,.76);border:1px solid rgba(20,33,29,.08);}",
      ".leados-primary,.leados-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:14px 18px;border-radius:999px;font-weight:800;text-decoration:none;cursor:pointer;}",
      ".leados-primary{background:var(--leados-accent);color:#fffaf4;border:0;}",
      ".leados-primary[disabled]{opacity:.72;cursor:wait;}",
      ".leados-secondary{background:rgba(255,255,255,.72);border:1px solid rgba(20,33,29,.1);color:var(--leados-text);}",
      ".leados-status{padding:14px 16px;border-radius:18px;border:1px solid rgba(20,33,29,.1);}",
      ".leados-status.error{background:rgba(161,39,47,.1);color:#8a1d25;border-color:rgba(161,39,47,.2);}",
      ".leados-status.success{background:rgba(29,111,81,.1);color:#134432;border-color:rgba(29,111,81,.2);}",
      "@media (max-width: 720px){#lead-os-embed-launcher{right:14px;bottom:14px;min-height:56px;padding:12px 16px;}#lead-os-embed-panel{left:12px;right:12px;bottom:12px;width:auto;max-height:min(92vh,900px);}.leados-shell{padding:18px;}.leados-form-grid,.leados-review-grid{grid-template-columns:1fr;}.leados-proof-row{display:grid;}}",
      "@media (prefers-reduced-motion: reduce){#lead-os-embed-launcher,*{scroll-behavior:auto;transition:none!important;animation:none!important;}}"
    ].join("");
    document.head.appendChild(style);
  }

  injectStyles();

  var overlay = create("div", {
    id: "lead-os-embed-overlay",
    hidden: "hidden"
  });

  overlay.addEventListener("click", closePanel);

  var panel = create("section", {
    id: "lead-os-embed-panel",
    hidden: "hidden",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "LeadOS embedded qualification panel"
  });

  panel.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closePanel();
    }
  });

  var launcher = create("button", {
    id: "lead-os-embed-launcher",
    type: "button",
    "aria-haspopup": "dialog",
    "aria-expanded": "false"
  });
  var launcherMark = create("span", { className: "leados-launcher-mark", "aria-hidden": "true" }, "LO");
  var launcherLabel = create("span", {}, config.launcherLabel);
  launcher.appendChild(launcherMark);
  launcher.appendChild(launcherLabel);
  launcher.addEventListener("click", function () {
    if (state.isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  requestBoot();
})();
