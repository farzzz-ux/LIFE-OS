# Contributing to LIFE OS

Thank you for your interest in contributing to **LIFE OS**! We welcome community contributions, bug reports, and feature proposals that advance personal productivity, privacy, and mathematical life tracking.

---

## 🛠️ Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/farzzz-ux/LIFE-OS.git
   cd LIFE-OS
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   # Server runs at http://localhost:3000
   ```

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all automated tests pass:

```bash
npm test
```

If you add new endpoints, mathematical scoring rules, or UI modules:
- Add corresponding test cases in `tests/`
- Ensure no regressions across the 5 Life Pillars
- Maintain mobile viewport responsiveness ($\le 768\text{px}$)

---

## 🎨 Code Style & Design Tokens

- **CSS & Aesthetics:** Use Vanilla CSS with design tokens defined in `style.css`. Preserve the dark glassmorphic design theme.
- **Frontend Architecture:** Vanilla ES6 modules and declarative DOM binding.
- **Backend Architecture:** Express 5 with Zod schema validation, Helmet security headers, and sanitize-html middleware.
- **Multi-Tenancy:** Always bind `WHERE user_id = ?` on database queries.

---

## 📬 Submitting a Pull Request

1. Create a descriptive feature branch: `git checkout -b feature/my-enhancement`
2. Commit your changes with clear, semantic commit messages.
3. Push to your branch and open a Pull Request against `main`.
4. Describe the problem, your solution, and include screenshots for UI changes.
