/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const H = globalThis, J = H.ShadowRoot && (H.ShadyCSS === void 0 || H.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, K = Symbol(), et = /* @__PURE__ */ new WeakMap();
let vt = class {
  constructor(t, e, i) {
    if (this._$cssResult$ = !0, i !== K) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (J && t === void 0) {
      const i = e !== void 0 && e.length === 1;
      i && (t = et.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), i && et.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const St = (o) => new vt(typeof o == "string" ? o : o + "", void 0, K), _t = (o, ...t) => {
  const e = o.length === 1 ? o[0] : t.reduce((i, s, r) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + o[r + 1], o[0]);
  return new vt(e, o, K);
}, At = (o, t) => {
  if (J) o.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const i = document.createElement("style"), s = H.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = e.cssText, o.appendChild(i);
  }
}, it = J ? (o) => o : (o) => o instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const i of t.cssRules) e += i.cssText;
  return St(e);
})(o) : o;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Et, defineProperty: Ct, getOwnPropertyDescriptor: Tt, getOwnPropertyNames: zt, getOwnPropertySymbols: Mt, getPrototypeOf: Pt } = Object, $ = globalThis, st = $.trustedTypes, Ot = st ? st.emptyScript : "", Dt = $.reactiveElementPolyfillSupport, T = (o, t) => o, I = { toAttribute(o, t) {
  switch (t) {
    case Boolean:
      o = o ? Ot : null;
      break;
    case Object:
    case Array:
      o = o == null ? o : JSON.stringify(o);
  }
  return o;
}, fromAttribute(o, t) {
  let e = o;
  switch (t) {
    case Boolean:
      e = o !== null;
      break;
    case Number:
      e = o === null ? null : Number(o);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(o);
      } catch {
        e = null;
      }
  }
  return e;
} }, G = (o, t) => !Et(o, t), ot = { attribute: !0, type: String, converter: I, reflect: !1, useDefault: !1, hasChanged: G };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), $.litPropertyMetadata ?? ($.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let S = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = ot) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const i = Symbol(), s = this.getPropertyDescriptor(t, i, e);
      s !== void 0 && Ct(this.prototype, t, s);
    }
  }
  static getPropertyDescriptor(t, e, i) {
    const { get: s, set: r } = Tt(this.prototype, t) ?? { get() {
      return this[e];
    }, set(n) {
      this[e] = n;
    } };
    return { get: s, set(n) {
      const l = s?.call(this);
      r?.call(this, n), this.requestUpdate(t, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? ot;
  }
  static _$Ei() {
    if (this.hasOwnProperty(T("elementProperties"))) return;
    const t = Pt(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(T("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(T("properties"))) {
      const e = this.properties, i = [...zt(e), ...Mt(e)];
      for (const s of i) this.createProperty(s, e[s]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [i, s] of e) this.elementProperties.set(i, s);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, i] of this.elementProperties) {
      const s = this._$Eu(e, i);
      s !== void 0 && this._$Eh.set(s, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const i = new Set(t.flat(1 / 0).reverse());
      for (const s of i) e.unshift(it(s));
    } else t !== void 0 && e.push(it(t));
    return e;
  }
  static _$Eu(t, e) {
    const i = e.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t) => t(this));
  }
  addController(t) {
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && t.hostConnected?.();
  }
  removeController(t) {
    this._$EO?.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const i of e.keys()) this.hasOwnProperty(i) && (t.set(i, this[i]), delete this[i]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return At(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), this._$EO?.forEach((t) => t.hostConnected?.());
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t) => t.hostDisconnected?.());
  }
  attributeChangedCallback(t, e, i) {
    this._$AK(t, i);
  }
  _$ET(t, e) {
    const i = this.constructor.elementProperties.get(t), s = this.constructor._$Eu(t, i);
    if (s !== void 0 && i.reflect === !0) {
      const r = (i.converter?.toAttribute !== void 0 ? i.converter : I).toAttribute(e, i.type);
      this._$Em = t, r == null ? this.removeAttribute(s) : this.setAttribute(s, r), this._$Em = null;
    }
  }
  _$AK(t, e) {
    const i = this.constructor, s = i._$Eh.get(t);
    if (s !== void 0 && this._$Em !== s) {
      const r = i.getPropertyOptions(s), n = typeof r.converter == "function" ? { fromAttribute: r.converter } : r.converter?.fromAttribute !== void 0 ? r.converter : I;
      this._$Em = s;
      const l = n.fromAttribute(e, r.type);
      this[s] = l ?? this._$Ej?.get(s) ?? l, this._$Em = null;
    }
  }
  requestUpdate(t, e, i, s = !1, r) {
    if (t !== void 0) {
      const n = this.constructor;
      if (s === !1 && (r = this[t]), i ?? (i = n.getPropertyOptions(t)), !((i.hasChanged ?? G)(r, e) || i.useDefault && i.reflect && r === this._$Ej?.get(t) && !this.hasAttribute(n._$Eu(t, i)))) return;
      this.C(t, e, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: i, reflect: s, wrapped: r }, n) {
    i && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, n ?? e ?? this[t]), r !== !0 || n !== void 0) || (this._$AL.has(t) || (this.hasUpdated || i || (e = void 0), this._$AL.set(t, e)), s === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [s, r] of this._$Ep) this[s] = r;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [s, r] of i) {
        const { wrapped: n } = r, l = this[s];
        n !== !0 || this._$AL.has(s) || l === void 0 || this.C(s, void 0, r, l);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), this._$EO?.forEach((i) => i.hostUpdate?.()), this.update(e)) : this._$EM();
    } catch (i) {
      throw t = !1, this._$EM(), i;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[T("elementProperties")] = /* @__PURE__ */ new Map(), S[T("finalized")] = /* @__PURE__ */ new Map(), Dt?.({ ReactiveElement: S }), ($.reactiveElementVersions ?? ($.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const z = globalThis, rt = (o) => o, N = z.trustedTypes, nt = N ? N.createPolicy("lit-html", { createHTML: (o) => o }) : void 0, bt = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, wt = "?" + w, Ut = `<${wt}>`, k = document, O = () => k.createComment(""), D = (o) => o === null || typeof o != "object" && typeof o != "function", Q = Array.isArray, Lt = (o) => Q(o) || typeof o?.[Symbol.iterator] == "function", B = `[ 	
\f\r]`, C = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, at = /-->/g, lt = />/g, y = RegExp(`>|${B}(?:([^\\s"'>=/]+)(${B}*=${B}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), ct = /'/g, ht = /"/g, $t = /^(?:script|style|textarea|title)$/i, Rt = (o) => (t, ...e) => ({ _$litType$: o, strings: t, values: e }), h = Rt(1), _ = Symbol.for("lit-noChange"), d = Symbol.for("lit-nothing"), dt = /* @__PURE__ */ new WeakMap(), x = k.createTreeWalker(k, 129);
function yt(o, t) {
  if (!Q(o) || !o.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return nt !== void 0 ? nt.createHTML(t) : t;
}
const Ht = (o, t) => {
  const e = o.length - 1, i = [];
  let s, r = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", n = C;
  for (let l = 0; l < e; l++) {
    const a = o[l];
    let c, u, g = -1, v = 0;
    for (; v < a.length && (n.lastIndex = v, u = n.exec(a), u !== null); ) v = n.lastIndex, n === C ? u[1] === "!--" ? n = at : u[1] !== void 0 ? n = lt : u[2] !== void 0 ? ($t.test(u[2]) && (s = RegExp("</" + u[2], "g")), n = y) : u[3] !== void 0 && (n = y) : n === y ? u[0] === ">" ? (n = s ?? C, g = -1) : u[1] === void 0 ? g = -2 : (g = n.lastIndex - u[2].length, c = u[1], n = u[3] === void 0 ? y : u[3] === '"' ? ht : ct) : n === ht || n === ct ? n = y : n === at || n === lt ? n = C : (n = y, s = void 0);
    const b = n === y && o[l + 1].startsWith("/>") ? " " : "";
    r += n === C ? a + Ut : g >= 0 ? (i.push(c), a.slice(0, g) + bt + a.slice(g) + w + b) : a + w + (g === -2 ? l : b);
  }
  return [yt(o, r + (o[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), i];
};
class U {
  constructor({ strings: t, _$litType$: e }, i) {
    let s;
    this.parts = [];
    let r = 0, n = 0;
    const l = t.length - 1, a = this.parts, [c, u] = Ht(t, e);
    if (this.el = U.createElement(c, i), x.currentNode = this.el.content, e === 2 || e === 3) {
      const g = this.el.content.firstChild;
      g.replaceWith(...g.childNodes);
    }
    for (; (s = x.nextNode()) !== null && a.length < l; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const g of s.getAttributeNames()) if (g.endsWith(bt)) {
          const v = u[n++], b = s.getAttribute(g).split(w), R = /([.?@])?(.*)/.exec(v);
          a.push({ type: 1, index: r, name: R[2], strings: b, ctor: R[1] === "." ? Nt : R[1] === "?" ? Ft : R[1] === "@" ? jt : F }), s.removeAttribute(g);
        } else g.startsWith(w) && (a.push({ type: 6, index: r }), s.removeAttribute(g));
        if ($t.test(s.tagName)) {
          const g = s.textContent.split(w), v = g.length - 1;
          if (v > 0) {
            s.textContent = N ? N.emptyScript : "";
            for (let b = 0; b < v; b++) s.append(g[b], O()), x.nextNode(), a.push({ type: 2, index: ++r });
            s.append(g[v], O());
          }
        }
      } else if (s.nodeType === 8) if (s.data === wt) a.push({ type: 2, index: r });
      else {
        let g = -1;
        for (; (g = s.data.indexOf(w, g + 1)) !== -1; ) a.push({ type: 7, index: r }), g += w.length - 1;
      }
      r++;
    }
  }
  static createElement(t, e) {
    const i = k.createElement("template");
    return i.innerHTML = t, i;
  }
}
function A(o, t, e = o, i) {
  if (t === _) return t;
  let s = i !== void 0 ? e._$Co?.[i] : e._$Cl;
  const r = D(t) ? void 0 : t._$litDirective$;
  return s?.constructor !== r && (s?._$AO?.(!1), r === void 0 ? s = void 0 : (s = new r(o), s._$AT(o, e, i)), i !== void 0 ? (e._$Co ?? (e._$Co = []))[i] = s : e._$Cl = s), s !== void 0 && (t = A(o, s._$AS(o, t.values), s, i)), t;
}
class It {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: i } = this._$AD, s = (t?.creationScope ?? k).importNode(e, !0);
    x.currentNode = s;
    let r = x.nextNode(), n = 0, l = 0, a = i[0];
    for (; a !== void 0; ) {
      if (n === a.index) {
        let c;
        a.type === 2 ? c = new L(r, r.nextSibling, this, t) : a.type === 1 ? c = new a.ctor(r, a.name, a.strings, this, t) : a.type === 6 && (c = new Bt(r, this, t)), this._$AV.push(c), a = i[++l];
      }
      n !== a?.index && (r = x.nextNode(), n++);
    }
    return x.currentNode = k, s;
  }
  p(t) {
    let e = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(t, i, e), e += i.strings.length - 2) : i._$AI(t[e])), e++;
  }
}
class L {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t, e, i, s) {
    this.type = 2, this._$AH = d, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = i, this.options = s, this._$Cv = s?.isConnected ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && t?.nodeType === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = A(this, t, e), D(t) ? t === d || t == null || t === "" ? (this._$AH !== d && this._$AR(), this._$AH = d) : t !== this._$AH && t !== _ && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Lt(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== d && D(this._$AH) ? this._$AA.nextSibling.data = t : this.T(k.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    const { values: e, _$litType$: i } = t, s = typeof i == "number" ? this._$AC(t) : (i.el === void 0 && (i.el = U.createElement(yt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(e);
    else {
      const r = new It(s, this), n = r.u(this.options);
      r.p(e), this.T(n), this._$AH = r;
    }
  }
  _$AC(t) {
    let e = dt.get(t.strings);
    return e === void 0 && dt.set(t.strings, e = new U(t)), e;
  }
  k(t) {
    Q(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let i, s = 0;
    for (const r of t) s === e.length ? e.push(i = new L(this.O(O()), this.O(O()), this, this.options)) : i = e[s], i._$AI(r), s++;
    s < e.length && (this._$AR(i && i._$AB.nextSibling, s), e.length = s);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for (this._$AP?.(!1, !0, e); t !== this._$AB; ) {
      const i = rt(t).nextSibling;
      rt(t).remove(), t = i;
    }
  }
  setConnected(t) {
    this._$AM === void 0 && (this._$Cv = t, this._$AP?.(t));
  }
}
class F {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, i, s, r) {
    this.type = 1, this._$AH = d, this._$AN = void 0, this.element = t, this.name = e, this._$AM = s, this.options = r, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = d;
  }
  _$AI(t, e = this, i, s) {
    const r = this.strings;
    let n = !1;
    if (r === void 0) t = A(this, t, e, 0), n = !D(t) || t !== this._$AH && t !== _, n && (this._$AH = t);
    else {
      const l = t;
      let a, c;
      for (t = r[0], a = 0; a < r.length - 1; a++) c = A(this, l[i + a], e, a), c === _ && (c = this._$AH[a]), n || (n = !D(c) || c !== this._$AH[a]), c === d ? t = d : t !== d && (t += (c ?? "") + r[a + 1]), this._$AH[a] = c;
    }
    n && !s && this.j(t);
  }
  j(t) {
    t === d ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Nt extends F {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === d ? void 0 : t;
  }
}
class Ft extends F {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== d);
  }
}
class jt extends F {
  constructor(t, e, i, s, r) {
    super(t, e, i, s, r), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = A(this, t, e, 0) ?? d) === _) return;
    const i = this._$AH, s = t === d && i !== d || t.capture !== i.capture || t.once !== i.once || t.passive !== i.passive, r = t !== d && (i === d || s);
    s && this.element.removeEventListener(this.name, this, i), r && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Bt {
  constructor(t, e, i) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    A(this, t);
  }
}
const qt = z.litHtmlPolyfillSupport;
qt?.(U, L), (z.litHtmlVersions ?? (z.litHtmlVersions = [])).push("3.3.3");
const Wt = (o, t, e) => {
  const i = e?.renderBefore ?? t;
  let s = i._$litPart$;
  if (s === void 0) {
    const r = e?.renderBefore ?? null;
    i._$litPart$ = s = new L(t.insertBefore(O(), r), r, void 0, e ?? {});
  }
  return s._$AI(o), s;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const M = globalThis;
class P extends S {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = Wt(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return _;
  }
}
P._$litElement$ = !0, P.finalized = !0, M.litElementHydrateSupport?.({ LitElement: P });
const Vt = M.litElementPolyfillSupport;
Vt?.({ LitElement: P });
(M.litElementVersions ?? (M.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Xt = { attribute: !0, type: String, converter: I, reflect: !1, hasChanged: G }, Zt = (o = Xt, t, e) => {
  const { kind: i, metadata: s } = e;
  let r = globalThis.litPropertyMetadata.get(s);
  if (r === void 0 && globalThis.litPropertyMetadata.set(s, r = /* @__PURE__ */ new Map()), i === "setter" && ((o = Object.create(o)).wrapped = !0), r.set(e.name, o), i === "accessor") {
    const { name: n } = e;
    return { set(l) {
      const a = t.get.call(this);
      t.set.call(this, l), this.requestUpdate(n, a, o, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(n, void 0, o, l), l;
    } };
  }
  if (i === "setter") {
    const { name: n } = e;
    return function(l) {
      const a = this[n];
      t.call(this, l), this.requestUpdate(n, a, o, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function j(o) {
  return (t, e) => typeof e == "object" ? Zt(o, t, e) : ((i, s, r) => {
    const n = s.hasOwnProperty(r);
    return s.constructor.createProperty(r, i), n ? Object.getOwnPropertyDescriptor(s, r) : void 0;
  })(o, t, e);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function m(o) {
  return j({ ...o, state: !0, attribute: !1 });
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Yt = (o, t, e) => (e.configurable = !0, e.enumerable = !0, Reflect.decorate && typeof t != "object" && Object.defineProperty(o, t, e), e);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function xt(o, t) {
  return (e, i, s) => {
    const r = (n) => n.renderRoot?.querySelector(o) ?? null;
    return Yt(e, i, { get() {
      return r(this);
    } });
  };
}
const Jt = 300;
class Kt {
  constructor(t) {
    this.opts = t, this.pendingCandidates = [], this.haveAnswer = !1, this.closed = !1;
  }
  async connect() {
    const { url: t, video: e, micTrack: i, onState: s } = this.opts;
    s("connecting");
    const r = new RTCPeerConnection({
      bundlePolicy: "max-bundle",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    this.pc = r, r.addTransceiver("video", { direction: "recvonly" }), r.addTransceiver("audio", { direction: "recvonly" }), i && r.addTransceiver(i, { direction: "sendonly" });
    const n = new MediaStream();
    e.srcObject = n, r.ontrack = (c) => {
      const u = c.receiver;
      "jitterBufferTarget" in u && (u.jitterBufferTarget = Jt), n.addTrack(c.track);
    }, r.onconnectionstatechange = () => {
      this.closed || (r.connectionState === "connected" ? (s("live"), e.play().catch((c) => {
        c?.name === "NotAllowedError" && !e.muted && (e.muted = !0, e.play().catch(() => {
        }));
      })) : r.connectionState === "failed" && s(
        "error",
        "The video connection failed. Away from home, Frigate's WebRTC port 8555 must be reachable and its candidates set."
      ));
    };
    const l = new WebSocket(t);
    if (this.ws = l, await new Promise((c, u) => {
      const g = window.setTimeout(() => u(new Error("Timed out reaching the stream.")), 1e4);
      l.onopen = () => {
        window.clearTimeout(g), c();
      }, l.onerror = () => {
        window.clearTimeout(g), u(new Error("Couldn't open the stream. Check the stream name and ws_path in the panel config."));
      };
    }), this.closed) return;
    l.onerror = () => {
      !this.closed && r.connectionState !== "connected" && s("error", "The stream connection dropped.");
    }, l.onclose = () => {
      !this.closed && r.connectionState !== "connected" && s("error", "The stream closed before video started.");
    }, l.onmessage = (c) => void this.handleMessage(String(c.data)), r.onicecandidate = (c) => {
      c.candidate && l.readyState === WebSocket.OPEN && l.send(JSON.stringify({ type: "webrtc/candidate", value: c.candidate.candidate }));
    };
    const a = await r.createOffer();
    await r.setLocalDescription(a), !this.closed && l.send(JSON.stringify({ type: "webrtc/offer", value: r.localDescription?.sdp }));
  }
  async handleMessage(t) {
    const e = this.pc;
    if (!e || this.closed) return;
    let i;
    try {
      i = JSON.parse(t);
    } catch {
      return;
    }
    switch (i.type) {
      case "webrtc/answer":
        await e.setRemoteDescription({ type: "answer", sdp: i.value }), this.haveAnswer = !0;
        for (const s of this.pendingCandidates.splice(0)) await this.addCandidate(s);
        break;
      case "webrtc/candidate":
        this.haveAnswer ? await this.addCandidate(i.value) : this.pendingCandidates.push(i.value);
        break;
      case "error":
        this.opts.onState("error", `go2rtc: ${i.value}`);
        break;
    }
  }
  async addCandidate(t) {
    try {
      await this.pc?.addIceCandidate({ candidate: t, sdpMid: "0" });
    } catch {
    }
  }
  /** Reads WebRTC stats for the incoming video. Call about once a second. */
  async readStats() {
    const t = this.pc;
    if (!t || this.closed) return null;
    const e = await t.getStats();
    let i;
    if (e.forEach((c) => {
      const u = c;
      u.type === "inbound-rtp" && u.kind === "video" && (i = u);
    }), !i) return null;
    const s = i.timestamp, r = i.bytesReceived ?? 0, n = i.framesDecoded ?? 0;
    let l = 0, a = i.framesPerSecond ?? 0;
    if (this.lastSample && s > this.lastSample.t) {
      const c = (s - this.lastSample.t) / 1e3;
      l = (r - this.lastSample.bytes) * 8 / 1e3 / c, i.framesPerSecond || (a = (n - this.lastSample.frames) / c);
    }
    return this.lastSample = { bytes: r, frames: n, t: s }, { kbps: l, fps: a, width: i.frameWidth ?? 0, height: i.frameHeight ?? 0 };
  }
  disconnect() {
    this.closed = !0, this.pc?.getSenders().forEach((t) => {
      t.track?.stop(), t.replaceTrack(null).catch(() => {
      });
    }), this.opts.micTrack?.stop();
    try {
      this.ws && this.ws.readyState <= WebSocket.OPEN && this.ws.close();
    } catch {
    }
    this.pc?.close(), this.opts.video.srcObject && (this.opts.video.srcObject = null);
  }
}
async function Gt(o, t) {
  const e = await kt(o, t), i = o.hassUrl ? o.hassUrl(e) : new URL(e, location.origin).toString(), s = new URL(i);
  return s.protocol = s.protocol === "https:" ? "wss:" : "ws:", s.toString();
}
async function kt(o, t, e = 300) {
  const { path: i } = await o.callWS({ type: "auth/sign_path", path: t, expires: e });
  return i;
}
async function Qt(o, t, e, i = 40) {
  const s = await o.callWS({
    type: "frigate/events/get",
    instance_id: t,
    cameras: [e],
    limit: i
  }), r = typeof s == "string" ? JSON.parse(s) : s;
  return Array.isArray(r) ? r : [];
}
const te = (o, t) => `/api/frigate/${o}/notifications/${t}/thumbnail.jpg`, ee = (o, t, e) => `/api/frigate/${o}/notifications/${e}/${t}/clip.mp4`, ie = (o, t, e, i) => `/api/frigate/${o}/recording/${t}/start/${e}/end/${i}`, se = new Intl.DateTimeFormat(void 0, { weekday: "short", day: "numeric", month: "short" });
function q(o) {
  const t = new Date(o * 1e3), e = /* @__PURE__ */ new Date(), i = /* @__PURE__ */ new Date();
  return i.setDate(e.getDate() - 1), t.toDateString() === e.toDateString() ? "Today" : t.toDateString() === i.toDateString() ? "Yesterday" : se.format(t);
}
function W(o) {
  const t = Array.isArray(o.sub_label) ? o.sub_label[0] : o.sub_label;
  return t || o.label.charAt(0).toUpperCase() + o.label.slice(1);
}
function oe(o, t) {
  if (!o || !t) return "";
  if (o >= 3840 || t >= 2160) return "4K";
  const e = o * t / 1e6;
  return e < 1.5 || Math.abs(o / t - 16 / 9) < 0.05 ? `${t}p` : `${Math.round(e)}MP`;
}
function re(o) {
  return o <= 0 ? "" : o >= 1e3 ? `${(o / 1e3).toFixed(1)} Mbps` : `${Math.round(o)} kbps`;
}
const Y = () => navigator.connection;
function pt() {
  const o = Y();
  return o ? !!o.saveData || o.type === "cellular" || ["slow-2g", "2g", "3g"].includes(o.effectiveType ?? "") : !1;
}
function ne(o, t) {
  if (t?.length) return t.includes(o);
  if (o === "localhost" || !o.includes(".") || /\.(local|lan|home\.arpa|internal)$/i.test(o)) return !0;
  const e = o.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (!e) return !1;
  const [i, s] = [Number(e[1]), Number(e[2])];
  return i === 10 || i === 127 || i === 192 && s === 168 || i === 172 && s >= 16 && s <= 31 || i === 169 && s === 254;
}
function ae(o) {
  if (!o) return 16 / 9;
  const [t, e] = o.split("/").map((s) => Number(s.trim())), i = e ? t / e : t;
  return Number.isFinite(i) && i > 0 ? i : 16 / 9;
}
var le = Object.defineProperty, f = (o, t, e, i) => {
  for (var s = void 0, r = o.length - 1, n; r >= 0; r--)
    (n = o[r]) && (s = n(t, e, s) || s);
  return s && le(t, e, s), s;
};
const V = new Intl.DateTimeFormat(void 0, { hour: "2-digit", minute: "2-digit" }), ce = {
  idle: "Offline",
  connecting: "Connecting",
  live: "Live",
  error: "Not connected"
}, X = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`, ut = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9h3l5-4v14l-5-4H4z" fill="currentColor" />
  <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`, ft = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9h3l5-4v14l-5-4H4z" fill="currentColor" />
  <path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`, he = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
  <circle cx="12" cy="13.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2" />
</svg>`, de = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, pe = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, ue = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, E = (o) => h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d=${o} fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, fe = E("M6 15l6-6 6 6"), ge = E("M6 9l6 6 6-6"), me = E("M15 6l-6 6 6 6"), ve = E("M9 6l6 6-6 6"), be = E("M12 5v14M5 12h14"), we = E("M5 12h14"), gt = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", Z = (o, t, e) => Math.min(e, Math.max(t, o)), mt = h`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`, tt = class tt extends P {
  constructor() {
    super(...arguments), this.narrow = !1, this.conn = "idle", this.error = "", this.muted = !0, this.talking = !1, this.talkError = "", this.events = [], this.eventsError = "", this.eventsLoaded = !1, this.brokenThumbs = /* @__PURE__ */ new Set(), this.clipSrc = "", this.clipFallbackUsed = !1, this.selected = 0, this.ringingIdx = -1, this.zoom = { s: 1, x: 0, y: 0 }, this.fullscreen = !1, this.toast = "", this.ptzOpen = !1, this.kiosk = !1, this.netTick = 0, this.connectedStream = "", this.talkLow = !1, this.ptzMoving = !1, this.showStatsDetail = !0, this.pointers = /* @__PURE__ */ new Map(), this.lastTap = 0, this.dragX = 0, this.settling = !1, this.moved = !1, this.nativeFullscreen = !1, this.liveClients = /* @__PURE__ */ new Set(), this.liveMics = /* @__PURE__ */ new Set(), this.started = !1, this.gen = 0, this.frameId = 0, this.lastFrame = 0, this.sleeping = !1, this.onFrame = (t) => {
      this.lastFrame = t, this.sleeping && this.started && !document.hidden && (this.sleeping = !1, this.start()), this.frameId = requestAnimationFrame(this.onFrame);
    }, this.checkOnScreen = () => {
      this.sleeping || !this.started || this.conn === "idle" || performance.now() - this.lastFrame > 4e3 && (this.sleeping = !0, this.silence());
    }, this.onPageHide = () => this.silence(), this.onVisibility = () => {
      this.started && (document.hidden ? this.silence() : this.start());
    }, this.onLocationChanged = () => {
      this.started && this.applyUrl();
    }, this.onNetworkChange = () => {
      this.netTick++, !(!this.started || document.hidden || this.talking) && this.activeStream !== this.connectedStream && (this.showToast(this.lowMode ? "Switched to SD to save data" : "Switched to HD"), this.start());
    }, this.toggleQuality = () => {
      this.qualityOverride = this.lowMode ? "hd" : "sd", this.start();
    }, this.ptzEnd = () => {
      this.ptzMoving && (this.ptzMoving = !1, this.ptzCall("stop"));
    }, this.toggleStatsDetail = () => {
      this.showStatsDetail = !this.showStatsDetail;
      try {
        localStorage.setItem("frigate-camera-panel:stats", this.showStatsDetail ? "shown" : "hidden");
      } catch {
      }
    }, this.onPointerDown = (t) => {
      if (t.currentTarget.setPointerCapture(t.pointerId), this.pointers.set(t.pointerId, { x: t.clientX, y: t.clientY }), this.pointers.size === 1 && (this.moved = !1), this.pointers.size === 2) {
        const [e, i] = [...this.pointers.values()];
        this.pinchStart = { dist: Math.hypot(e.x - i.x, e.y - i.y) || 1, s: this.zoom.s }, this.panStart = void 0, this.moved = !0, this.swipeStart = void 0, this.dragX = 0;
      } else this.pointers.size === 1 && (this.panStart = { x: t.clientX, y: t.clientY, zx: this.zoom.x, zy: this.zoom.y }, this.swipeStart = this.zoom.s === 1 ? { x: t.clientX, y: t.clientY, t: performance.now() } : void 0);
    }, this.onPointerMove = (t) => {
      if (this.pointers.has(t.pointerId)) {
        if (this.pointers.set(t.pointerId, { x: t.clientX, y: t.clientY }), this.pointers.size === 2 && this.pinchStart) {
          const [e, i] = [...this.pointers.values()], s = this.pinchStart.s * (Math.hypot(e.x - i.x, e.y - i.y) / this.pinchStart.dist);
          this.setZoom(s, this.zoom.x, this.zoom.y);
        } else if (this.pointers.size === 1 && this.panStart) {
          const e = t.clientX - this.panStart.x, i = t.clientY - this.panStart.y;
          if (Math.abs(e) + Math.abs(i) > 6 && (this.moved = !0), this.zoom.s > 1)
            this.setZoom(this.zoom.s, this.panStart.zx + e, this.panStart.zy + i);
          else if (this.swipeStart && Math.abs(e) > Math.abs(i)) {
            const s = e > 0 && this.selected === 0 || e < 0 && this.selected === this.cameras.length - 1;
            this.dragX = s ? e * 0.25 : e * 0.6;
          }
        }
      }
    }, this.onPointerEnd = (t) => {
      if (this.pointers.delete(t.pointerId), this.pointers.size < 2 && (this.pinchStart = void 0), this.pointers.size === 1) {
        const [a] = [...this.pointers.values()];
        this.panStart = { x: a.x, y: a.y, zx: this.zoom.x, zy: this.zoom.y };
        return;
      }
      if (this.pointers.size > 0) return;
      this.panStart = void 0;
      const e = this.swipeStart;
      if (this.swipeStart = void 0, this.dragX !== 0 && (this.dragX = 0, this.settling = !0, window.clearTimeout(this.settleTimer), this.settleTimer = window.setTimeout(() => this.settling = !1, 220)), e && t.type === "pointerup" && this.zoom.s === 1) {
        const a = t.clientX - e.x, c = t.clientY - e.y;
        if (performance.now() - e.t < 800 && Math.abs(a) > 60 && Math.abs(a) > Math.abs(c) * 1.5) {
          this.selectCamera(this.selected + (a < 0 ? 1 : -1));
          return;
        }
      }
      if (t.type !== "pointerup" || this.moved) return;
      const i = performance.now();
      if (i - this.lastTap > 300) {
        this.lastTap = i;
        return;
      }
      if (this.lastTap = 0, this.zoom.s > 1) {
        this.setZoom(1, 0, 0);
        return;
      }
      const s = this.stageEl.getBoundingClientRect(), r = t.clientX - (s.left + s.width / 2), n = t.clientY - (s.top + s.height / 2);
      this.setZoom(2.5, -1.5 * r, -1.5 * n);
    }, this.toggleFullscreen = async () => {
      if (this.fullscreen) {
        document.fullscreenElement && await document.exitFullscreen().catch(() => {
        }), this.fullscreen = !1, this.nativeFullscreen = !1, this.setZoom(1, 0, 0);
        return;
      }
      this.fullscreen = !0;
      try {
        await this.stageEl.requestFullscreen({ navigationUI: "hide" }), this.nativeFullscreen = !0;
      } catch {
        this.nativeFullscreen = !1;
      }
    }, this.onFullscreenChange = () => {
      !document.fullscreenElement && this.nativeFullscreen && (this.nativeFullscreen = !1, this.fullscreen = !1, this.setZoom(1, 0, 0));
    }, this.snapshot = async () => {
      const t = this.video;
      if (!t?.videoWidth) {
        this.showToast("No picture to save yet");
        return;
      }
      const e = document.createElement("canvas");
      e.width = t.videoWidth, e.height = t.videoHeight, e.getContext("2d")?.drawImage(t, 0, 0);
      const i = await new Promise((u) => e.toBlob(u, "image/jpeg", 0.92));
      if (!i) {
        this.showToast("Snapshot failed");
        return;
      }
      const s = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-"), r = `${this.cam.name.trim().replace(/\s+/g, "-").toLowerCase()}-${s}.jpg`, n = new File([i], r, { type: "image/jpeg" });
      if (/Home ?Assistant/i.test(navigator.userAgent) && navigator.canShare?.({ files: [n] })) {
        try {
          await navigator.share({ files: [n], title: this.cam.name });
        } catch (u) {
          u?.name !== "AbortError" && this.showToast("Couldn't share the snapshot");
        }
        return;
      }
      const a = URL.createObjectURL(i), c = document.createElement("a");
      c.href = a, c.download = r, document.body.appendChild(c), c.click(), c.remove(), window.setTimeout(() => URL.revokeObjectURL(a), 1e4), this.showToast("Snapshot saved to Downloads");
    }, this.onVolumeChange = (t) => {
      const e = t.currentTarget;
      e.muted !== this.muted && (this.muted = e.muted, e.muted && this.talking && this.showToast("Tap the speaker button to hear them"));
    }, this.toggleTalk = async () => {
      if (this.talkError = "", this.talking) {
        await this.start();
        return;
      }
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        this.talkError = "Talking needs a secure (https) connection to Home Assistant.";
        return;
      }
      const t = await this.openMic();
      if (!t) return;
      this.setMuted(!1), this.talkLow = this.panel?.config?.talk_quality === "sd" && !!this.cam.stream_low;
      let e = await this.start(t);
      if (!e && this.talkLow) {
        this.talkLow = !1;
        const i = await this.openMic();
        if (!i) {
          this.start();
          return;
        }
        e = await this.start(i);
      }
      e ? (this.talking = !0, this.setMuted(!1), this.ringingIdx = -1) : (this.talkError = "Talking couldn't start. Check this camera's go2rtc stream has an RTSP source for two-way audio.", this.start());
    }, this.onClipError = () => {
      this.openClip && !this.clipFallbackUsed && this.useEventClip(this.openClip);
    }, this.closeClip = () => {
      this.openClip = void 0, this.clipSrc = "";
    };
  }
  get cfg() {
    const t = this.panel?.config ?? {}, e = t.frigate_instance ?? "frigate";
    return {
      instance: e,
      wsPath: t.ws_path ?? `/api/frigate/${e}/mse/api/ws`
    };
  }
  get cameras() {
    const t = this.panel?.config ?? {};
    return t.cameras?.length ? t.cameras : [
      {
        name: t.title ?? "Front door",
        stream: t.stream ?? "",
        camera: t.camera ?? "",
        aspect_ratio: t.aspect_ratio,
        doorbell_entity: t.doorbell_entity
      }
    ];
  }
  get cam() {
    const t = this.cameras;
    return t[this.selected] ?? t[0];
  }
  /**
   * One frame size for every camera: the tallest camera's shape. Wider cameras get
   * black bars above and below, so the controls and timeline never jump when switching.
   */
  get stageRatio() {
    return Math.min(...this.cameras.map((t) => ae(t.aspect_ratio)));
  }
  get storageKey() {
    return `frigate-camera-panel:camera:${this.panel?.url_path ?? "cameras"}`;
  }
  connectedCallback() {
    super.connectedCallback(), document.addEventListener("visibilitychange", this.onVisibility), document.addEventListener("fullscreenchange", this.onFullscreenChange), window.addEventListener("pagehide", this.onPageHide), document.addEventListener("freeze", this.onPageHide), window.addEventListener("location-changed", this.onLocationChanged), window.addEventListener("popstate", this.onLocationChanged), Y()?.addEventListener("change", this.onNetworkChange), this.refreshTimer = window.setInterval(() => {
      this.started && !document.hidden && this.loadEvents();
    }, 6e4), this.lastFrame = performance.now(), this.frameId = requestAnimationFrame(this.onFrame), this.watchdogTimer = window.setInterval(this.checkOnScreen, 2e3);
  }
  /**
   * Stops every stream, microphone and recording, and turns the sound off. Used whenever the panel
   * leaves the screen. Sound only ever comes back when someone taps the speaker again, so a page woken
   * in the background (Android's app can report "visible" while switching apps) stays silent.
   */
  silence() {
    this.stop(), this.muted = !0;
    const t = this.video;
    t && (t.muted = !0, t.pause(), t.srcObject = null), this.renderRoot?.querySelectorAll(".sheet video").forEach((e) => e.pause());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("pagehide", this.onPageHide), document.removeEventListener("freeze", this.onPageHide), window.removeEventListener("location-changed", this.onLocationChanged), window.removeEventListener("popstate", this.onLocationChanged), document.removeEventListener("visibilitychange", this.onVisibility), document.removeEventListener("fullscreenchange", this.onFullscreenChange), Y()?.removeEventListener("change", this.onNetworkChange), window.clearInterval(this.refreshTimer), window.clearTimeout(this.toastTimer), window.clearTimeout(this.settleTimer), window.clearTimeout(this.ringTimer), window.clearInterval(this.watchdogTimer), cancelAnimationFrame(this.frameId), this.sleeping = !1, this.silence(), this.started = !1;
  }
  willUpdate(t) {
    t.has("hass") && this.checkDoorbell(t.get("hass")), t.has("panel") && this.setAttribute("theme", this.panel?.config?.theme === "ha" ? "ha" : "porch");
  }
  updated() {
    if (!this.started && this.hass && this.panel) {
      this.started = !0;
      try {
        this.showStatsDetail = localStorage.getItem("frigate-camera-panel:stats") !== "hidden";
        const t = Number(localStorage.getItem(this.storageKey));
        Number.isInteger(t) && t >= 0 && t < this.cameras.length && (this.selected = t);
      } catch {
      }
      this.applyUrl(!0), this.start(), this.loadEvents();
    }
  }
  /**
   * Reads options from the address, so dashboard buttons can open the panel as e.g.
   * /cameras?kiosk=1&camera=front_door. `camera` matches a camera's Frigate name,
   * stream name or display name.
   */
  applyUrl(t = !1) {
    if (!location.pathname.startsWith(`/${this.panel?.url_path ?? "cameras"}`)) return;
    const e = new URLSearchParams(location.search), i = e.get("kiosk");
    this.kiosk = i !== null && i !== "0" && i !== "false";
    const s = e.get("camera")?.toLowerCase();
    if (!s) return;
    const r = this.cameras.findIndex(
      (n) => [n.camera, n.stream, n.name].some((l) => l?.toLowerCase() === s)
    );
    r < 0 || (t ? this.selected = r : this.selectCamera(r));
  }
  checkDoorbell(t) {
    this.hass && this.cameras.forEach((e, i) => {
      const s = e.doorbell_entity;
      if (!s) return;
      const r = this.hass.states[s]?.state, n = t?.states[s]?.state;
      if (r === "on" && n !== "on") {
        if (window.clearTimeout(this.ringTimer), this.ringingIdx = i, !this.started || document.hidden) return;
        this.selected !== i ? this.selectCamera(i) : this.conn !== "live" && this.start(), this.loadEvents();
      } else r !== "on" && n === "on" && (this.ringTimer = window.setTimeout(() => this.ringingIdx = -1, 3e4));
    });
  }
  selectCamera(t) {
    if (!(t === this.selected || !this.cameras[t])) {
      this.ptzEnd(), this.ptzOpen = !1, this.selected = t, this.talkError = "", this.events = [], this.eventsError = "", this.eventsLoaded = !1;
      try {
        localStorage.setItem(this.storageKey, String(t));
      } catch {
      }
      this.updateComplete.then(() => {
        this.renderRoot.querySelector(".cam[aria-pressed='true']")?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" }), this.start(), this.loadEvents();
      });
    }
  }
  async start(t) {
    this.stop(t);
    const e = this.gen;
    this.error = "";
    const i = this.activeStream;
    if (this.connectedStream = i, !i)
      return t?.stop(), this.conn = "error", this.error = "Add `stream` (the go2rtc stream name) for this camera in the panel config.", !1;
    try {
      const s = await Gt(this.hass, `${this.cfg.wsPath}?src=${encodeURIComponent(i)}`);
      if (e !== this.gen)
        return t?.stop(), !1;
      const r = new Kt({
        url: s,
        video: this.video,
        micTrack: t,
        onState: (n, l) => {
          this.client === r && (this.conn = n, n === "live" && this.panel?.config?.show_stats === !0 && this.startStats(), l && (this.error = l), n === "error" && (this.talking = !1));
        }
      });
      return this.client = r, this.liveClients.add(r), await r.connect(), e !== this.gen ? (r.disconnect(), this.liveClients.delete(r), !1) : e === this.gen;
    } catch (s) {
      return t?.stop(), e !== this.gen || (this.conn = "error", this.error = s instanceof Error ? s.message : String(s)), !1;
    }
  }
  /** Closes every connection and microphone, except `keepMic` (one just opened for a new talk session). */
  stop(t) {
    this.ptzEnd(), this.gen++, t || (this.talkLow = !1);
    for (const e of this.liveClients) e.disconnect();
    this.liveClients.clear(), this.client = void 0;
    for (const e of this.liveMics) e !== t && e.stop();
    this.liveMics = t ? /* @__PURE__ */ new Set([t]) : /* @__PURE__ */ new Set(), this.talking = !1, this.conn = "idle", this.zoom = { s: 1, x: 0, y: 0 }, this.pointers.clear(), this.swipeStart = void 0, this.dragX = 0, window.clearInterval(this.statsTimer), this.stats = void 0;
  }
  // ---- Stream quality (HD / SD) ------------------------------------------------
  /** True when the lighter stream should be used. */
  get lowMode() {
    if (this.netTick, this.qualityOverride) return this.qualityOverride === "sd";
    const t = this.panel?.config?.low_bandwidth ?? "auto";
    return t === "always" ? !0 : t === "never" ? !1 : t === "mobile" ? pt() : pt() || !ne(location.hostname, this.panel?.config?.home_hosts);
  }
  get activeStream() {
    return (this.talkLow || this.lowMode) && this.cam.stream_low ? this.cam.stream_low : this.cam.stream;
  }
  // ---- Pan / tilt / zoom (via the Frigate integration's frigate.ptz action) ------
  get ptz() {
    const t = this.cam.ptz;
    if (!t) return null;
    const e = t === !0 ? {} : t;
    return { entity: e.entity ?? `camera.${this.cam.camera}`, presets: e.presets ?? [] };
  }
  ptzCall(t, e) {
    const i = this.ptz;
    i && this.hass.callService("frigate", "ptz", e ? { action: t, argument: e } : { action: t }, { entity_id: i.entity }).catch(() => this.showToast("The camera didn't respond. Check ONVIF is set up in Frigate."));
  }
  /** Press and hold: start moving on press, stop on release. */
  ptzStart(t, e, i) {
    t.preventDefault(), t.currentTarget.setPointerCapture(t.pointerId), this.ptzMoving = !0, this.ptzCall(e, i);
  }
  renderPtz() {
    const t = this.ptz;
    if (!t || !this.ptzOpen || this.conn !== "live") return d;
    const e = (i, s, r, n, l = "") => h`<button
      class=${l}
      title=${r}
      aria-label=${r}
      @pointerdown=${(a) => this.ptzStart(a, i, s)}
      @pointerup=${this.ptzEnd}
      @pointercancel=${this.ptzEnd}
      @lostpointercapture=${this.ptzEnd}
      @contextmenu=${(a) => a.preventDefault()}
    >
      ${n}
    </button>`;
    return h`
      <div class="ptz">
        ${t.presets.length ? h`<div class="ptz-presets">
              ${t.presets.map(
      (i) => h`<button class="preset" title=${`Go to ${i}`} @click=${() => this.ptzCall("preset", i)}>
                  ${i}
                </button>`
    )}
            </div>` : d}
        <div class="ptz-row">
          <div class="ptz-pad">
            ${e("move", "up", "Tilt up", fe, "up")}
            ${e("move", "left", "Pan left", me, "left")}
            ${e("move", "right", "Pan right", ve, "right")}
            ${e("move", "down", "Tilt down", ge, "down")}
          </div>
          <div class="ptz-zoom">
            ${e("zoom", "in", "Zoom in", be)}
            ${e("zoom", "out", "Zoom out", we)}
          </div>
        </div>
      </div>
    `;
  }
  // ---- Video stats -----------------------------------------------------------
  startStats() {
    window.clearInterval(this.statsTimer);
    const t = this.client;
    this.statsTimer = window.setInterval(async () => {
      if (!t || t !== this.client) return;
      const e = await t.readStats().catch(() => null);
      if (!e || t !== this.client) return;
      const i = e.width || this.video?.videoWidth || 0, s = e.height || this.video?.videoHeight || 0;
      this.stats = {
        res: oe(i, s),
        bitrate: re(e.kbps),
        fps: e.fps > 0 ? `${Math.round(e.fps)} fps` : ""
      };
    }, 1e3);
  }
  // ---- Zoom and pan ---------------------------------------------------------
  setZoom(t, e, i) {
    const s = Z(t, 1, 5), r = this.stageEl?.getBoundingClientRect(), n = r ? r.width * (s - 1) / 2 : 0, l = r ? r.height * (s - 1) / 2 : 0;
    this.zoom = { s, x: Z(e, -n, n), y: Z(i, -l, l) };
  }
  // ---- Snapshot --------------------------------------------------------------
  showToast(t) {
    this.toast = t, window.clearTimeout(this.toastTimer), this.toastTimer = window.setTimeout(() => this.toast = "", 2500);
  }
  setMuted(t) {
    this.muted = t;
    const e = this.video;
    e && (e.muted = t, t || e.play().catch((i) => {
      i?.name === "NotAllowedError" && (e.muted = !0, this.muted = !0, this.showToast("Tap the speaker button to hear sound"));
    }));
  }
  /** Opens the microphone, or says why it couldn't. */
  async openMic() {
    try {
      const e = (await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: !0, noiseSuppression: !0, autoGainControl: !0 },
        video: !1
      })).getAudioTracks()[0];
      return this.liveMics.add(e), e;
    } catch (t) {
      this.talkError = t?.name === "NotAllowedError" ? "Microphone access is blocked. Allow it for Home Assistant in your phone's settings, then tap Talk again." : "The microphone couldn't start. Close other apps using it and tap Talk again.";
      return;
    }
  }
  async loadEvents() {
    const t = this.cam.camera;
    if (t)
      try {
        const e = this.cam.labels?.map((r) => r.toLowerCase()), i = await Qt(this.hass, this.cfg.instance, t, e?.length ? 150 : 40);
        if (t !== this.cam.camera) return;
        const s = e?.length ? i.filter((r) => e.includes(r.label.toLowerCase())) : i;
        this.events = [...s].sort((r, n) => n.start_time - r.start_time).slice(0, 40), this.eventsError = "";
      } catch {
        if (t !== this.cam.camera) return;
        this.eventsError = "Activity couldn't load. Check the Frigate integration is installed and `camera` in the panel config matches Frigate.";
      } finally {
        t === this.cam.camera && (this.eventsLoaded = !0);
      }
  }
  render() {
    const t = this.cam, e = this.cameras, i = t.talk !== !1, s = this.ptzOpen && this.ptz ? "concealed" : "";
    return h`
      <div class="app ${this.kiosk ? "kiosk" : ""}">
        ${this.kiosk ? d : h`<header>
              ${this.narrow ? h`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>` : d}
              <h1>${t.name}</h1>
            </header>`}

        ${e.length > 1 ? h`<nav class="cams" aria-label="Cameras">
              ${e.map(
      (r, n) => h`<button
                  class="cam ${this.ringingIdx === n ? "ringing" : ""}"
                  aria-pressed=${String(n === this.selected)}
                  @click=${() => this.selectCamera(n)}
                >
                  ${r.name}
                </button>`
    )}
            </nav>` : d}

        <section class="stage ${this.fullscreen ? "full" : ""}" style=${`--ratio: ${this.stageRatio}`}>
          <div
            class="zoomer"
            style=${`touch-action: ${this.zoom.s > 1 ? "none" : "pan-y"}`}
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerEnd}
            @pointercancel=${this.onPointerEnd}
          >
            <video
              class="live ${this.settling ? "settle" : ""}"
              autoplay
              playsinline
              disablepictureinpicture
              poster=${gt}
              .muted=${this.muted}
              @volumechange=${this.onVolumeChange}
              style=${`transform: translate(${this.zoom.x + this.dragX}px, ${this.zoom.y}px) scale(${this.zoom.s})`}
            ></video>
          </div>
          ${this.talking ? h`<button
                class="mic-pill"
                title="Stop talking"
                aria-label="Microphone on. Tap to stop talking"
                @click=${this.toggleTalk}
              >
                ${X}<span>Mic on</span>
              </button>` : d}
          ${this.conn === "live" ? h`<div class="stage-tools">
                ${this.ptz ? h`<button
                      class="tool ${this.ptzOpen ? "active" : ""}"
                      title=${this.ptzOpen ? "Done with pan and tilt" : "Pan and tilt"}
                      aria-label=${this.ptzOpen ? "Done with pan and tilt" : "Pan and tilt"}
                      aria-pressed=${String(this.ptzOpen)}
                      @click=${() => this.ptzOpen = !this.ptzOpen}
                    >
                      ${ue}
                    </button>` : d}
                ${this.cam.stream_low ? h`<button
                      class="tool text ${s}"
                      title=${this.lowMode ? "Switch to HD" : "Switch to SD (saves data)"}
                      aria-label=${this.talkLow ? "Standard quality while talking" : this.lowMode ? "Standard quality. Switch to HD" : "High quality. Switch to SD to save data"}
                      ?disabled=${this.talking}
                      @click=${this.toggleQuality}
                    >
                      ${this.talkLow || this.lowMode ? "SD" : "HD"}
                    </button>` : d}
                ${this.fullscreen && i ? h`<button
                      class="tool ${this.talking ? "on" : ""} ${s}"
                      title=${this.talking ? "Stop talking" : "Talk"}
                      aria-label=${this.talking ? "Stop talking" : "Talk"}
                      aria-pressed=${String(this.talking)}
                      @click=${this.toggleTalk}
                    >
                      ${X}
                    </button>` : d}
                ${this.fullscreen ? h`<button
                      class="tool ${s}"
                      title=${this.muted ? "Turn sound on" : "Turn sound off"}
                      aria-label=${this.muted ? "Turn sound on" : "Turn sound off"}
                      @click=${() => this.setMuted(!this.muted)}
                    >
                      ${this.muted ? ft : ut}
                    </button>` : d}
                <button class="tool ${s}" title="Save snapshot" aria-label="Save snapshot" @click=${this.snapshot}>
                  ${he}
                </button>
                ${this.fullscreen ? h`<button class="tool ${s}" title="Reconnect" aria-label="Reconnect" @click=${() => this.start()}>
                      ${mt}
                    </button>` : d}
                <button
                  class="tool ${s}"
                  title=${this.fullscreen ? "Exit full screen" : "Full screen"}
                  aria-label=${this.fullscreen ? "Exit full screen" : "Full screen"}
                  @click=${this.toggleFullscreen}
                >
                  ${this.fullscreen ? pe : de}
                </button>
              </div>` : d}
          ${this.renderPtz()}
          <div class="top-left">
          <span class="status ${this.conn}" role="status">${ce[this.conn]}</span>
          ${this.panel?.config?.show_stats === !0 && this.conn === "live" && this.stats?.res ? h`<button
                class="stats"
                title=${this.showStatsDetail ? "Hide bitrate and frame rate" : "Show bitrate and frame rate"}
                aria-label=${this.showStatsDetail ? "Hide bitrate and frame rate" : "Show bitrate and frame rate"}
                @click=${this.toggleStatsDetail}
              >
                <span class="res">${this.stats.res}</span>
                ${this.showStatsDetail && this.stats.bitrate ? h`<span class="detail">${this.stats.bitrate}</span>` : d}
                ${this.showStatsDetail && this.stats.fps ? h`<span class="detail">${this.stats.fps}</span>` : d}
              </button>` : d}
          </div>
          ${this.toast ? h`<div class="toast" role="status">${this.toast}</div>` : d}
          ${this.ringingIdx === this.selected ? h`<div class="ring-banner" role="status">Someone's at the door</div>` : d}
          ${this.conn === "error" ? h`<div class="overlay">
                <p>${this.error}</p>
                <button class="retry" @click=${() => this.start()}>Try again</button>
              </div>` : d}
        </section>

        <div class="controls">
          <button
            class="round"
            title=${this.muted ? "Turn sound on" : "Turn sound off"}
            aria-label=${this.muted ? "Turn sound on" : "Turn sound off"}
            @click=${() => this.setMuted(!this.muted)}
          >
            ${this.muted ? ft : ut}
          </button>
          <button
            class="talk ${this.talking ? "on" : ""}"
            title=${i ? "" : "This camera can't talk"}
            aria-label=${i ? this.talking ? "Stop talking" : "Talk" : "Talk (not available on this camera)"}
            aria-pressed=${String(this.talking)}
            ?disabled=${!i || this.conn !== "live" && !this.talking}
            @click=${this.toggleTalk}
          >
            ${X}<span>${this.talking ? "Stop talking" : "Talk"}</span>
          </button>
          <button class="round" title="Reconnect" aria-label="Reconnect" @click=${() => this.start()}>
            ${mt}
          </button>
        </div>
        ${this.talkError ? h`<p class="talk-error" role="alert">${this.talkError}</p>` : d}

        <section class="activity">
          <h2>Activity</h2>
          ${this.renderEvents()}
        </section>
      </div>
      ${this.openClip ? this.renderClip(this.openClip) : d}
    `;
  }
  renderEvents() {
    if (this.eventsError) return h`<p class="empty">${this.eventsError}</p>`;
    if (!this.eventsLoaded) return h`<p class="empty">Loading…</p>`;
    const t = this.events.filter((i) => !this.brokenThumbs.has(i.id));
    if (!t.length)
      return h`<p class="empty">Nothing yet. People and vehicles Frigate spots here will appear in the timeline.</p>`;
    const e = t.map((i, s) => {
      const r = q(i.start_time), n = s > 0 ? q(t[s - 1].start_time) : "";
      return { ev: i, day: r !== n ? r : "" };
    });
    return h`
      <div class="timeline" role="list" aria-label="Activity timeline">
        ${e.map(
      ({ ev: i, day: s }) => h`<button
            class="tile ${s ? "new-day" : ""}"
            role="listitem"
            ?disabled=${!i.has_clip}
            aria-label=${`${W(i)}, ${q(i.start_time)} at ${V.format(new Date(i.start_time * 1e3))}`}
            @click=${() => this.openEvent(i)}
          >
            <span class="thumb">
              <img
                src=${te(this.cfg.instance, i.id)}
                alt=""
                loading="lazy"
                @error=${() => this.brokenThumbs = /* @__PURE__ */ new Set([...this.brokenThumbs, i.id])}
              />
              ${s ? h`<span class="day-badge">${s}</span>` : d}
            </span>
            <span class="meta">
              <span class="what">${W(i)}</span>
              <time>${V.format(new Date(i.start_time * 1e3))}</time>
            </span>
          </button>`
    )}
      </div>
    `;
  }
  // ---- Clip playback ---------------------------------------------------------
  /** Time window to play: padded around the event, and never shorter than the minimum. */
  clipWindow(t) {
    const e = this.panel?.config?.clip_padding ?? {}, i = e.before ?? 3, s = e.after ?? 3, r = e.min ?? 6, n = Date.now() / 1e3;
    let l = t.start_time - i, a = (t.end_time ?? n) + s;
    const c = r - (a - l);
    return c > 0 && (l -= c / 2, a += c / 2), a = Math.min(a, n), { start: Math.floor(l), end: Math.ceil(a) };
  }
  openEvent(t) {
    this.openClip = t, this.clipSrc = "", this.clipFallbackUsed = !1, this.prepareClip(t);
  }
  async prepareClip(t) {
    try {
      const { start: e, end: i } = this.clipWindow(t), s = await kt(this.hass, ie(this.cfg.instance, t.camera, e, i));
      this.openClip?.id === t.id && (this.clipSrc = s);
    } catch {
      this.openClip?.id === t.id && this.useEventClip(t);
    }
  }
  /** Falls back to Frigate's own (shorter) event clip if the padded recording won't load. */
  useEventClip(t) {
    this.clipFallbackUsed = !0, this.clipSrc = ee(this.cfg.instance, t.camera, t.id);
  }
  renderClip(t) {
    return h`
      <div class="sheet-backdrop" @click=${this.closeClip}>
        <div class="sheet" role="dialog" aria-label="Recording" @click=${(e) => e.stopPropagation()}>
          <div class="sheet-head">
            <span>${W(t)}, ${V.format(new Date(t.start_time * 1e3))}</span>
            <button class="close" @click=${this.closeClip}>Close</button>
          </div>
          ${this.clipSrc ? h`<video
                src=${this.clipSrc}
                poster=${gt}
                controls
                autoplay
                playsinline
                @error=${this.onClipError}
              ></video>` : h`<div class="clip-loading">Loading…</div>`}
        </div>
      </div>
    `;
  }
};
tt.styles = _t`
    :host {
      --dusk: #1b2431;
      --slate: #273345;
      --slate-2: #33415a;
      --mist: #e9eef4;
      --haze: #93a1b4;
      --porch: #f5b83d;
      --on-porch: #2a1d00; /* text on the amber accent */
      --signal: #e5534b;
      --error-text: #ffb4ae;
      --stage-edge: rgb(255 255 255 / 0.08);
      --stage-shadow: 0 0 0 0 transparent;
      --on-video: #e9eef4;
      --on-video-muted: #b5c0cf;
      --on-video-edge: 0 0 0 1px rgb(255 255 255 / 0.28), 0 1px 4px rgb(0 0 0 / 0.35);
      display: block;
      /* Home Assistant's panel container has no set height, so 100% would stop at the content. */
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--dusk);
      color: var(--mist);
      font-family: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    /* Follow the user's Home Assistant theme. Things drawn over the video
       (pills, buttons, toasts) stay dark on purpose so they read on any picture. */
    :host([theme="ha"]) {
      --dusk: var(--primary-background-color, #111111);
      --slate: var(--secondary-background-color, #282828);
      --slate-2: var(--divider-color, rgba(127, 127, 127, 0.3));
      --mist: var(--primary-text-color, #e1e1e1);
      --haze: var(--secondary-text-color, #9b9b9b);
      --porch: var(--accent-color, #ff9800);
      --on-porch: var(--text-accent-color, var(--text-primary-color, #ffffff));
      --signal: var(--error-color, #db4437);
      --error-text: var(--error-color, #db4437);
      --stage-edge: var(--divider-color, rgba(127, 127, 127, 0.25));
      --stage-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
    }
    .app {
      max-width: 560px;
      margin: 0 auto;
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
    .app.kiosk {
      /* No header, so the camera buttons need the status-bar clearance instead */
      padding-top: calc(12px + env(safe-area-inset-top));
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
    }
    h1 {
      flex: 1;
      margin: 0;
      font-size: 1.375rem;
      font-weight: 650;
      letter-spacing: -0.01em;
    }
    /* Top-left of the video: connection status, then the optional stats pill */
    .top-left {
      position: absolute;
      top: 10px;
      left: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stage.full .top-left {
      top: calc(14px + env(safe-area-inset-top));
      left: calc(14px + env(safe-area-inset-left));
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 8px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.75);
      color: var(--on-video-muted);
      box-shadow: var(--on-video-edge);
      font-size: 0.75rem;
      font-weight: 600;
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .status::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--on-video-muted);
    }
    .status.live {
      color: var(--on-video);
    }
    .status.live::before {
      background: var(--signal);
    }
    @media (prefers-reduced-motion: no-preference) {
      .status.connecting::before {
        animation: status-pulse 1s ease-in-out infinite;
      }
    }
    @keyframes status-pulse {
      50% {
        opacity: 0.3;
      }
    }

    .cams {
      display: flex;
      gap: 8px;
      padding: 0 16px 12px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .cams::-webkit-scrollbar {
      display: none;
    }
    .cam {
      flex: none;
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--slate);
      color: var(--haze);
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .cam[aria-pressed="true"] {
      background: var(--mist);
      color: var(--dusk);
    }
    .cam.ringing {
      box-shadow: inset 0 0 0 2px var(--porch);
    }

    .stage {
      position: relative;
      aspect-ratio: var(--ratio, 4/3);
      background: #000;
      overflow: hidden;
      /* A fine outline, so a bright sky doesn't melt into a light page */
      box-shadow: 0 0 0 1px var(--stage-edge), var(--stage-shadow);
    }
    @media (min-width: 560px) {
      .stage {
        margin: 0 16px;
        border-radius: 20px;
      }
    }
    /* Belt and braces: hide the browser's own start-playback icon on the live view */
    video.live::-webkit-media-controls,
    video.live::-webkit-media-controls-start-playback-button,
    video.live::-webkit-media-controls-overlay-play-button {
      display: none !important;
      -webkit-appearance: none;
    }
    .stage video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .zoomer {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }
    .zoomer video {
      transform-origin: center;
      will-change: transform;
    }
    .zoomer video.settle {
      transition: transform 0.2s ease-out;
    }
    .stage.full {
      position: fixed;
      inset: 0;
      z-index: 20;
      width: 100%;
      height: 100%;
      margin: 0;
      border-radius: 0;
      aspect-ratio: auto;
      box-shadow: none;
    }
    .stage-tools {
      position: absolute;
      right: 10px;
      bottom: 10px;
      display: flex;
      gap: 8px;
    }
    .stage.full .stage-tools {
      right: calc(14px + env(safe-area-inset-right));
      bottom: calc(14px + env(safe-area-inset-bottom));
    }
    .tool {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgb(27 36 49 / 0.7);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .tool.text {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }
    .tool:disabled {
      opacity: 0.5;
    }
    .tool {
      transition:
        width 0.22s ease,
        margin 0.22s ease,
        opacity 0.15s ease;
    }
    .tool.concealed {
      width: 0;
      margin-left: -8px; /* cancel the row gap, so nothing is left behind */
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .tool {
        transition: none;
      }
    }
    .tool.active {
      background: var(--on-video);
      color: #1b2431;
    }
    .ptz {
      position: absolute;
      left: 10px;
      bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 60%;
    }
    .stage.full .ptz {
      left: calc(14px + env(safe-area-inset-left));
      bottom: calc(14px + env(safe-area-inset-bottom));
    }
    .ptz-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .ptz-pad {
      display: grid;
      grid-template-columns: repeat(3, 40px);
      grid-template-rows: repeat(3, 40px);
      gap: 4px;
    }
    .ptz-pad .up {
      grid-column: 2;
      grid-row: 1;
    }
    .ptz-pad .left {
      grid-column: 1;
      grid-row: 2;
    }
    .ptz-pad .right {
      grid-column: 3;
      grid-row: 2;
    }
    .ptz-pad .down {
      grid-column: 2;
      grid-row: 3;
    }
    .ptz-zoom {
      display: grid;
      gap: 4px;
    }
    .ptz button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgb(27 36 49 / 0.7);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .ptz button:active {
      background: var(--on-video);
      color: #1b2431;
    }
    .ptz button svg {
      width: 20px;
      height: 20px;
    }
    .ptz-presets {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .ptz-presets::-webkit-scrollbar {
      display: none;
    }
    .ptz .preset {
      flex: none;
      width: auto;
      height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .tool.on {
      background: var(--porch);
      color: var(--on-porch);
    }
    .tool svg {
      width: 20px;
      height: 20px;
    }
    .mic-pill {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 11px 4px 8px;
      border-radius: 999px;
      background: var(--porch);
      color: var(--on-porch);
      font-size: 0.75rem;
      font-weight: 700;
      box-shadow: 0 0 16px color-mix(in srgb, var(--porch) 50%, transparent);
    }
    .mic-pill svg {
      width: 14px;
      height: 14px;
    }
    @media (prefers-reduced-motion: no-preference) {
      .mic-pill svg {
        animation: mic-pulse 1.6s ease-in-out infinite;
      }
    }
    @keyframes mic-pulse {
      50% {
        opacity: 0.5;
      }
    }
    .stage.full .mic-pill {
      top: calc(14px + env(safe-area-inset-top));
      right: calc(14px + env(safe-area-inset-right));
    }
    .stats {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.75);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
    .stats .res {
      font-weight: 700;
    }
    .stats .detail {
      color: var(--on-video-muted);
    }
    .toast {
      position: absolute;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      padding: 6px 12px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.9);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      font-size: 0.8125rem;
      white-space: nowrap;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 12px;
      padding: 24px;
      text-align: center;
      background: rgb(27 36 49 / 0.72);
      color: var(--on-video);
    }
    .overlay p {
      margin: 0;
      max-width: 32ch;
      line-height: 1.4;
    }
    .ring-banner {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      padding: 10px 14px;
      border-radius: 14px;
      background: var(--porch);
      color: var(--on-porch);
      font-weight: 650;
    }

    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 3px solid var(--porch);
      outline-offset: 3px;
    }
    .controls {
      display: grid;
      grid-template-columns: 56px 1fr 56px;
      align-items: center;
      gap: 16px;
      padding: 20px 16px 8px;
    }
    .round {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--slate);
    }
    .round svg {
      width: 24px;
      height: 24px;
    }
    .talk {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: 72px;
      border-radius: 36px;
      background: var(--slate);
      color: var(--porch);
      font-size: 1.125rem;
      font-weight: 650;
      transition: background 0.2s, color 0.2s, box-shadow 0.2s;
    }
    .talk svg {
      width: 28px;
      height: 28px;
    }
    .talk.on {
      background: var(--porch);
      color: var(--on-porch);
      box-shadow:
        0 0 0 8px color-mix(in srgb, var(--porch) 18%, transparent),
        0 0 32px color-mix(in srgb, var(--porch) 45%, transparent);
    }
    .talk:disabled {
      opacity: 0.45;
      cursor: default;
    }
    @media (prefers-reduced-motion: no-preference) {
      .talk.on {
        animation: glow 2.4s ease-in-out infinite;
      }
    }
    @keyframes glow {
      50% {
        box-shadow:
          0 0 0 14px color-mix(in srgb, var(--porch) 10%, transparent),
          0 0 44px color-mix(in srgb, var(--porch) 55%, transparent);
      }
    }
    .retry {
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--mist);
      color: var(--dusk);
      font-weight: 600;
    }
    .talk-error {
      margin: 4px 16px 0;
      color: var(--error-text);
      font-size: 0.875rem;
      text-align: center;
    }

    .activity {
      padding: 16px;
    }
    h2 {
      margin: 8px 0 4px;
      font-size: 1.0625rem;
      font-weight: 650;
    }
    .timeline {
      display: flex;
      gap: 10px;
      margin: 0 -16px;
      padding: 4px 16px 8px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x proximity;
      scroll-padding-left: 16px;
      scrollbar-width: none;
    }
    .timeline::-webkit-scrollbar {
      display: none;
    }
    .tile {
      flex: none;
      display: grid;
      gap: 6px;
      width: 148px;
      padding: 0;
      background: transparent;
      text-align: left;
      scroll-snap-align: start;
    }
    .tile img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      border-radius: 12px;
      background: var(--slate);
      transition: transform 0.15s;
    }
    .tile:active img {
      transform: scale(0.97);
    }
    .tile:disabled {
      cursor: default;
    }
    .tile:disabled img {
      opacity: 0.55;
    }
    .meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
      padding: 0 2px;
      font-size: 0.875rem;
    }
    .what {
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    time {
      flex: none;
      color: var(--haze);
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
    }
    .thumb {
      position: relative;
      display: block;
    }
    .day-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgb(27 36 49 / 0.85);
      color: var(--on-video);
      box-shadow: var(--on-video-edge);
      font-size: 0.75rem;
      font-weight: 650;
      white-space: nowrap;
    }
    /* A little extra space where a new day starts */
    .tile.new-day:not(:first-child) {
      margin-left: 12px;
    }
    .empty {
      max-width: 40ch;
      color: var(--haze);
      line-height: 1.45;
    }

    .sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgb(0 0 0 / 0.6);
    }
    .sheet {
      width: 100%;
      max-width: 560px;
      padding: 12px 12px calc(16px + env(safe-area-inset-bottom));
      border-radius: 20px 20px 0 0;
      background: var(--slate);
    }
    @media (prefers-reduced-motion: no-preference) {
      .sheet {
        animation: rise 0.22s ease-out;
      }
    }
    @keyframes rise {
      from {
        transform: translateY(24px);
        opacity: 0.6;
      }
    }
    .sheet-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 4px 12px;
      font-weight: 600;
    }
    .close {
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--slate-2);
    }
    .clip-loading {
      display: grid;
      place-items: center;
      aspect-ratio: 16 / 9;
      border-radius: 12px;
      background: #000;
      color: var(--haze);
    }
    .sheet video {
      display: block;
      width: 100%;
      border-radius: 12px;
      background: #000;
    }
  `;
let p = tt;
f([
  j({ attribute: !1 })
], p.prototype, "hass");
f([
  j({ attribute: !1 })
], p.prototype, "panel");
f([
  j({ type: Boolean })
], p.prototype, "narrow");
f([
  m()
], p.prototype, "conn");
f([
  m()
], p.prototype, "error");
f([
  m()
], p.prototype, "muted");
f([
  m()
], p.prototype, "talking");
f([
  m()
], p.prototype, "talkError");
f([
  m()
], p.prototype, "events");
f([
  m()
], p.prototype, "eventsError");
f([
  m()
], p.prototype, "eventsLoaded");
f([
  m()
], p.prototype, "brokenThumbs");
f([
  m()
], p.prototype, "openClip");
f([
  m()
], p.prototype, "clipSrc");
f([
  m()
], p.prototype, "selected");
f([
  m()
], p.prototype, "ringingIdx");
f([
  m()
], p.prototype, "zoom");
f([
  m()
], p.prototype, "fullscreen");
f([
  m()
], p.prototype, "toast");
f([
  m()
], p.prototype, "ptzOpen");
f([
  m()
], p.prototype, "kiosk");
f([
  m()
], p.prototype, "qualityOverride");
f([
  m()
], p.prototype, "netTick");
f([
  m()
], p.prototype, "talkLow");
f([
  m()
], p.prototype, "stats");
f([
  m()
], p.prototype, "showStatsDetail");
f([
  xt("video.live")
], p.prototype, "video");
f([
  xt("section.stage")
], p.prototype, "stageEl");
f([
  m()
], p.prototype, "dragX");
f([
  m()
], p.prototype, "settling");
customElements.get("frigate-camera-panel") || customElements.define("frigate-camera-panel", p);
export {
  p as FrigateCameraPanel
};
