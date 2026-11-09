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
          window.addToCalendar(fd.get("Data"), "Fiori da " + "Piante e Fiori Roma di Seddrak",
            (fd.get("Modalità") || "") + "\nProdotto: " + (fd.get("Prodotto") || "") + "\nInfo: 389 996 2511 (anche WhatsApp)");
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

  // Avviso breve in basso
  var toastT;
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3500);
  }
  function copyText(txt) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
    return new Promise(function (ok, ko) {
      var ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? ok() : ko(); } catch (e) { ko(e); } ta.remove();
    });
  }

  // Copia IBAN, intestatario, causale
  $$("[data-copy]").forEach(function (b) {
    var label = b.textContent;
    b.addEventListener("click", function () {
      var txt = (($(b.getAttribute("data-copy")) || {}).textContent || "").trim();
      if (!b.hasAttribute("data-keep-spaces")) txt = txt.replace(/\s+/g, "");
      copyText(txt).then(function () {
        b.textContent = "Copiato ✓"; setTimeout(function () { b.textContent = label; }, 2500);
        toast(b.getAttribute("data-copied") || "Copiato!");
        track("copia", b.getAttribute("data-copy"));
      }, function () { toast("Tieni premuto sul testo per copiarlo"); });
    });
  });
  var share = $("[data-share-iban]");
  if (share && navigator.share) {
    share.hidden = false;
    share.addEventListener("click", function () {
      navigator.share({ title: "Dati per il bonifico", text: share.getAttribute("data-text") }).catch(function () {});
    });
  }

  // Calendario prenotazione
  var MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  var GIORNI = ["lun","mar","mer","gio","ven","sab","dom"];
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function nice(s) { var p = s.split("-"); var d = new Date(+p[0], p[1] - 1, +p[2]); return GIORNI[(d.getDay() + 6) % 7] + " " + d.getDate() + " " + MESI[d.getMonth()]; }
  $$("[data-cal]").forEach(function (cal) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var max = new Date(today); max.setDate(max.getDate() + 90);
    var target = cal.getAttribute("data-target") ? $(cal.getAttribute("data-target")) : null;
    var go = $("[data-cal-go]", cal), pick = $(".cal-pick", cal), grid = $(".cal-grid", cal);
    var sel = (target && target.value) || new URLSearchParams(location.search).get("data") || "";
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(sel)) { var p = sel.split("-"); view = new Date(+p[0], p[1] - 1, 1); } else sel = "";
    function choose(v) {
      sel = v;
      if (target) { target.value = v; target.dispatchEvent(new Event("change")); }
      if (go) { go.href = cal.getAttribute("data-book") + "?data=" + v; go.textContent = "Prenota ora per " + nice(v) + "!"; }
      if (pick) { pick.innerHTML = "Hai scelto <strong></strong>."; $("strong", pick).textContent = nice(v); }
      draw();
    }
    function draw() {
      $(".cal-month", cal).textContent = MESI[view.getMonth()] + " " + view.getFullYear();
      grid.innerHTML = "";
      GIORNI.forEach(function (g) { var h = document.createElement("span"); h.className = "cal-dow"; h.textContent = g; grid.appendChild(h); });
      var lead = (view.getDay() + 6) % 7;
      for (var i = 0; i < lead; i++) grid.appendChild(document.createElement("span"));
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= days; d++) {
        var date = new Date(view.getFullYear(), view.getMonth(), d), v = iso(date);
        var b = document.createElement("button"); b.type = "button"; b.className = "cal-day"; b.textContent = d;
        b.setAttribute("aria-label", nice(v));
        if (date < today || date > max) b.disabled = true;
        if (+date === +today) b.classList.add("is-today");
        b.setAttribute("aria-pressed", v === sel ? "true" : "false");
        b.addEventListener("click", (function (val) { return function () { choose(val); }; })(v));
        grid.appendChild(b);
      }
      $("[data-cal-prev]", cal).disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
      $("[data-cal-next]", cal).disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > max;
    }
    $("[data-cal-prev]", cal).addEventListener("click", function () { view.setMonth(view.getMonth() - 1); draw(); });
    $("[data-cal-next]", cal).addEventListener("click", function () { view.setMonth(view.getMonth() + 1); draw(); });
    if (target) target.addEventListener("input", function () {
      if (/^\d{4}-\d{2}-\d{2}$/.test(target.value)) { sel = target.value; var p = sel.split("-"); view = new Date(+p[0], p[1] - 1, 1); draw(); }
    });
    if (go) go.addEventListener("click", function () { track("prenota_ora", "calendario"); });
    if (sel) choose(sel); else draw();
  });

  // Aggiungi al calendario (dopo la prenotazione)
  window.addToCalendar = function (data, title, details) {
    if (!data) return;
    var d0 = data.replace(/-/g, ""), n = new Date(data + "T12:00:00"); n.setDate(n.getDate() + 1);
    var d1 = iso(n).replace(/-/g, "");
    var g = $("#cal-google"), f = $("#cal-ics");
    if (g) g.href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(title) +
      "&dates=" + d0 + "/" + d1 + "&details=" + encodeURIComponent(details);
    if (f) {
      var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fiori Seddrak//IT", "BEGIN:VEVENT",
        "UID:" + Date.now() + "@fioriseddrak.it", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
        "DTSTART;VALUE=DATE:" + d0, "DTEND;VALUE=DATE:" + d1, "SUMMARY:" + title,
        "DESCRIPTION:" + details.replace(/\n/g, "\\n"), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      f.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    }
  };

  // Popup "Prenota ora!"
  var promo = $("#promo");
  if (promo) {
    var seen = function () { try { return Date.now() - Number(localStorage.getItem("promo-chiuso") || 0) < 1000 * 60 * 60 * 24 * 3; } catch (e) { return false; } };
    var shown = false;
    var show = function () {
      if (shown || seen() || (inst && !inst.hidden)) return;
      shown = true; promo.hidden = false; track("promo", "mostrato");
    };
    var hide = function () { promo.hidden = true; try { localStorage.setItem("promo-chiuso", String(Date.now())); } catch (e) { /* ok */ } };
    var inst = $("#installa");
    setTimeout(show, 20000);
    window.addEventListener("scroll", function onS() {
      if (window.scrollY > (document.body.scrollHeight - innerHeight) * 0.45) { window.removeEventListener("scroll", onS); setTimeout(show, 1500); }
    }, { passive: true });
    $("[data-promo-close]", promo).addEventListener("click", hide);
    $("[data-promo-go]", promo).addEventListener("click", function () { track("prenota_ora", "popup"); hide(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !promo.hidden) hide(); });
  }

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
