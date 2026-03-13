(function () {
  if (window.__leadOSMounted) return;
  window.__leadOSMounted = true;

  var config = Object.assign(
    {
      runtimeBaseUrl: window.location.origin,
      service: "lead-capture",
      niche: "general"
    },
    window.LeadOSConfig || {}
  );

  if (!config.runtimeBaseUrl) return;

  function create(tag, attrs, text) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "style") {
        Object.assign(el.style, attrs.style);
      } else {
        el.setAttribute(key, attrs[key]);
      }
    });
    if (text) el.textContent = text;
    return el;
  }

  function postLead(email, message) {
    return fetch(config.runtimeBaseUrl + "/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "embedded_widget",
        email: email,
        message: message,
        service: config.service,
        niche: config.niche,
        metadata: {
          origin: window.location.origin,
          path: window.location.pathname,
          title: document.title
        }
      })
    }).then(function (response) {
      return response.json();
    });
  }

  var drawer = create("div", {
    id: "lead-os-embed-drawer",
    style: {
      position: "fixed",
      right: "24px",
      bottom: "92px",
      width: "360px",
      maxWidth: "calc(100vw - 32px)",
      background: "#08152c",
      color: "#f3f7fb",
      borderRadius: "18px",
      boxShadow: "0 24px 64px rgba(0,0,0,.28)",
      padding: "18px",
      zIndex: "2147483646",
      display: "none",
      fontFamily: "Segoe UI, sans-serif"
    }
  });

  var heading = create("h3", { style: { margin: "0 0 10px" } }, "Lead OS");
  var copy = create("p", { style: { margin: "0 0 12px", color: "#bdd0ef" } }, "Capture and route this visitor into the hosted lead engine.");
  var email = create("input", {
    type: "email",
    placeholder: "you@example.com",
    style: {
      width: "100%",
      marginBottom: "10px",
      padding: "12px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,.12)",
      background: "#102447",
      color: "#fff"
    }
  });
  var message = create("textarea", {
    placeholder: "What does the visitor need?",
    style: {
      width: "100%",
      minHeight: "84px",
      marginBottom: "10px",
      padding: "12px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,.12)",
      background: "#102447",
      color: "#fff"
    }
  });
  var status = create("div", { style: { minHeight: "20px", color: "#90f4e6", marginBottom: "8px" } });
  var submit = create("button", {
    type: "button",
    style: {
      width: "100%",
      padding: "12px",
      borderRadius: "12px",
      border: "0",
      background: "#14b8a6",
      color: "#08152c",
      fontWeight: "700",
      cursor: "pointer"
    }
  }, "Submit Lead");
  var assessment = create("a", {
    href: config.runtimeBaseUrl + "/assess/" + config.niche,
    target: "_blank",
    rel: "noreferrer",
    style: { display: "inline-block", marginTop: "12px", color: "#90f4e6" }
  }, "Open Hosted Assessment");

  submit.addEventListener("click", function () {
    submit.disabled = true;
    status.textContent = "Submitting...";
    postLead(email.value, message.value)
      .then(function (result) {
        status.textContent = result.success ? "Lead captured." : (result.error || "Submission failed.");
      })
      .catch(function () {
        status.textContent = "Submission failed.";
      })
      .finally(function () {
        submit.disabled = false;
      });
  });

  drawer.appendChild(heading);
  drawer.appendChild(copy);
  drawer.appendChild(email);
  drawer.appendChild(message);
  drawer.appendChild(status);
  drawer.appendChild(submit);
  drawer.appendChild(assessment);

  var launcher = create("button", {
    id: "lead-os-embed-launcher",
    style: {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      width: "58px",
      height: "58px",
      borderRadius: "50%",
      border: "0",
      background: "#14b8a6",
      color: "#08152c",
      fontWeight: "700",
      cursor: "pointer",
      zIndex: "2147483647"
    }
  }, "LO");

  launcher.addEventListener("click", function () {
    drawer.style.display = drawer.style.display === "none" ? "block" : "none";
  });

  document.body.appendChild(drawer);
  document.body.appendChild(launcher);
})();
