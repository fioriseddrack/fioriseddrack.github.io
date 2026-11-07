/* Piante e Fiori Roma di Seddrak – script unico, nessuna libreria */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Menu mobile
  var toggle = $(".nav-toggle"), nav = $("#menu");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Mappe Google caricate solo su richiesta (più veloce, nessun cookie finché non serve)
  $$(".map[data-embed]").forEach(function (box) {
    var btn = $("button", box);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = box.getAttribute("data-embed");
      f.title = box.getAttribute("data-title") || "Mappa";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.allowFullscreen = true;
      box.innerHTML = "";
      box.classList.add("loaded");
      box.appendChild(f);
    });
  });

  // Lightbox minimale per le gallerie
  $$("[data-lightbox] a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var src = a.getAttribute("href"), alt = ($("img", a) || {}).alt || "";
      var lb = document.createElement("div");
      lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
      lb.innerHTML = '<img alt=""><button class="btn btn-white" type="button">Chiudi</button>';
      $("img", lb).src = src; $("img", lb).alt = alt;
      function close() { lb.remove(); document.removeEventListener("keydown", onKey); a.focus(); }
      function onKey(ev) { if (ev.key === "Escape") close(); }
      lb.addEventListener("click", function (ev) { if (ev.target === lb || ev.target.tagName === "BUTTON") close(); });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(lb);
      $("button", lb).focus();
    });
  });

  // Misurazione clic su Chiama / WhatsApp (attiva solo se c'è il tag Google e il consenso)
  function track(name, label) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, { event_category: "contatto", event_label: label });
    if (name === "chiamata" && window.CALL_CONVERSION) {
      window.gtag("event", "conversion", { send_to: window.CALL_CONVERSION });
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    if (a.hasAttribute("data-call")) track("chiamata", a.getAttribute("data-call"));
    else if (a.hasAttribute("data-wa")) track("whatsapp", a.getAttribute("data-wa"));
  });

  // Modulo: prepara il messaggio e apre WhatsApp o l'email (sito statico, nessun server)
  var form = $("#richiesta");
  if (form) {
    var params = new URLSearchParams(location.search);
    [["servizio", "#f-servizio"], ["chiosco", "#f-chiosco"]].forEach(function (p) {
      var v = params.get(p[0]), sel = $(p[1]);
      if (!v || !sel) return;
      $$("option", sel).forEach(function (o) { if (o.getAttribute("data-slug") === v || o.value === v) o.selected = true; });
    });
    var via = "whatsapp";
    $$("button[type=submit]", form).forEach(function (b) {
      b.addEventListener("click", function () { via = b.value; });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ["#f-nome", "#f-msg"].forEach(function (id) {
        var input = $(id), field = input.closest(".field"), err = $(".err", field);
        var bad = input.value.trim().length < 2;
        field.classList.toggle("has-error", bad);
        input.setAttribute("aria-invalid", bad ? "true" : "false");
        if (err) err.hidden = !bad;
        if (bad && ok) { input.focus(); ok = false; }
      });
      if (!ok) return;
      var val = function (id) { var el = $(id); return el ? el.value.trim() : ""; };
      var kind = form.getAttribute("data-kind");
      var lines = [
        "Ciao Youssef, sono " + val("#f-nome") + ".",
        kind === "preventivo" ? "Vorrei un preventivo." : "",
        val("#f-servizio") ? "Servizio: " + val("#f-servizio") : "",
        val("#f-chiosco") ? "Chiosco: " + val("#f-chiosco") : "",
        val("#f-data") ? "Data: " + val("#f-data").split("-").reverse().join("/") : "",
        "",
        val("#f-msg"),
        "",
        val("#f-tel") ? "Il mio telefono: " + val("#f-tel") : ""
      ].filter(function (l, i, arr) { return l !== "" || (i > 0 && arr[i - 1] !== ""); });
      var text = lines.join("\n").trim();
      if (via === "email") {
        var subject = (kind === "preventivo" ? "Richiesta preventivo" : "Richiesta") +
          (val("#f-servizio") ? ": " + val("#f-servizio") : "") + " – " + val("#f-nome");
        track("email", kind);
        location.href = "mailto:" + form.getAttribute("data-email") +
          "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
      } else {
        track("whatsapp", "modulo-" + kind);
        window.open("https://wa.me/" + form.getAttribute("data-wa") + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      }
    });
  }

  // PayPal con carta: lo script si carica solo se richiesto
  var pp = $("#load-paypal");
  if (pp) {
    pp.addEventListener("click", function () {
      var box = pp.parentNode, id = box.getAttribute("data-button");
      pp.disabled = true; pp.textContent = "Caricamento…";
      var s = document.createElement("script");
      s.src = "https://www.paypal.com/sdk/js?client-id=" + box.getAttribute("data-client") +
        "&components=hosted-buttons&disable-funding=venmo&currency=EUR";
      s.onload = function () { pp.remove(); window.paypal.HostedButtons({ hostedButtonId: id }).render("#" + box.id); };
      s.onerror = function () { pp.disabled = false; pp.textContent = "PayPal non risponde: riprova o usa il pulsante sopra"; };
      document.head.appendChild(s);
    });
  }

  // Consenso cookie (presente solo quando è attivo il tag Google)
  var banner = $("#consenso");
  function choice() { try { return localStorage.getItem("consenso"); } catch (e) { return null; } }
  function setChoice(v) {
    try { localStorage.setItem("consenso", v); } catch (e) { /* storage non disponibile */ }
    if (typeof window.gtag === "function") {
      var g = v === "si" ? "granted" : "denied";
      window.gtag("consent", "update", { ad_storage: g, ad_user_data: g, ad_personalization: g, analytics_storage: g });
    }
    if (banner) banner.hidden = true;
  }
  if (banner) {
    if (!choice()) banner.hidden = false;
    $$("[data-consent]", banner).forEach(function (b) {
      b.addEventListener("click", function () { setChoice(b.getAttribute("data-consent")); });
    });
  }
  var reset = $("[data-consent-reset]");
  if (reset && banner) reset.addEventListener("click", function () { banner.hidden = false; });

  // Pre-selezione da link (es. /prenota/?servizio=bouquet-da-sposa)
  var qs = new URLSearchParams(location.search);
  if (qs.get("servizio") && $("#b-cosa")) {
    $$("option", $("#b-cosa")).forEach(function (o) { if (o.getAttribute("data-slug") === qs.get("servizio")) o.selected = true; });
  }

  // Prenotazione: invio a FormSubmit (email a Youssef + ricevuta al cliente), ripiego su WhatsApp
  var book = $("#prenota");
  if (book) {
    var addr = $("#b-indirizzo"), via = $("#b-via"), dateIn = $("#b-data");
    var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    dateIn.min = t.toISOString().slice(0, 10);
    function syncMode() {
      var m = (book.querySelector("input[name='Modalità']:checked") || {}).value || "";
      var home = m.indexOf("Consegna") === 0;
      addr.hidden = !home; via.required = home;
    }
    $$("input[name='Modalità']", book).forEach(function (r) { r.addEventListener("change", syncMode); });
    syncMode();

    function summary() {
      var fd = new FormData(book), out = ["Ciao Youssef, vorrei prenotare dei fiori."];
      fd.forEach(function (v, k) { if (k.charAt(0) !== "_" && String(v).trim()) out.push(k + ": " + v); });
      return out.join("\n");
    }
    book.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = null;
      $$("input[required], select[required], textarea[required]", book).forEach(function (el) {
        if (el.closest("[hidden]")) return;
        var bad = el.type === "checkbox" ? !el.checked
          : el.type === "email" ? !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(el.value.trim())
          : el.value.trim().length < (el.type === "date" ? 1 : 2);
        if (el.type === "date" && !bad && el.value < el.min) bad = true;
        var field = el.closest(".field"), err = field && $(".err", field);
        if (field) field.classList.toggle("has-error", bad);
        el.setAttribute("aria-invalid", bad ? "true" : "false");
        if (err) err.hidden = !bad;
        if (bad && !first) first = el;
      });
      if (first) { first.focus(); return; }
      var btn = $("button[type=submit]", book), msg = $(".form-error", book);
      btn.disabled = true; btn.textContent = "Invio in corso…"; msg.hidden = true;
      var fd = new FormData(book);
      fd.append("Nome e cognome", fd.get("Nome") + " " + fd.get("Cognome"));
      fd.set("_replyto", fd.get("email"));
      fetch(book.action, { method: "POST", body: fd, headers: { Accept: "application/json" } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || String(res.j.success) !== "true") throw new Error(res.j.message || "errore");
          track("prenotazione", "modulo");
          $("#prenota-wa").href = "https://wa.me/" + book.getAttribute("data-wa") + "?text=" + encodeURIComponent(summary());
          book.hidden = true;
          var ok = $("#prenota-ok"); ok.hidden = false; ok.focus(); ok.scrollIntoView();
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = "Invia la prenotazione";
          msg.innerHTML = "";
          msg.appendChild(document.createTextNode("La prenotazione non è partita. Inviala su WhatsApp con un tocco: i dati sono già scritti. "));
          var a = document.createElement("a");
          a.href = "https://wa.me/" + book.getAttribute("data-wa") + "?text=" + encodeURIComponent(summary());
          a.target = "_blank"; a.rel = "noopener"; a.textContent = "Invia su WhatsApp";
          msg.appendChild(a); msg.hidden = false; msg.focus && msg.scrollIntoView();
        });
    });
  }

  // Copia IBAN
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var txt = ($(b.getAttribute("data-copy")) || {}).textContent || "";
      if (navigator.clipboard) navigator.clipboard.writeText(txt.replace(/\s+/g, "")).then(function () { b.textContent = "Copiato"; });
    });
  });

  // App installabile (PWA)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register((document.documentElement.getAttribute("data-base") || "") + "/sw.js").catch(function () {}); });
  }
  var inst = $("#installa"), deferred = null;
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  function dismissedRecently() {
    try { return Date.now() - Number(localStorage.getItem("installa-chiuso") || 0) < 1000 * 60 * 60 * 24 * 14; } catch (e) { return false; }
  }
  function showInstall(ios) {
    if (!inst || standalone || dismissedRecently()) return;
    var sub = $(".install-sub", inst);
    if (ios) { sub.textContent = sub.getAttribute("data-ios"); $("[data-install]", inst).hidden = true; }
    setTimeout(function () { inst.hidden = false; }, 4000);
  }
  if (inst) {
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; showInstall(false); });
    var ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) showInstall(true);
    $("[data-install]", inst).addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (c) { track("installa_app", c.outcome); inst.hidden = true; deferred = null; });
    });
    $("[data-install-close]", inst).addEventListener("click", function () {
      inst.hidden = true;
      try { localStorage.setItem("installa-chiuso", String(Date.now())); } catch (e) { /* ok */ }
    });
    window.addEventListener("appinstalled", function () { inst.hidden = true; });
  }
})();
