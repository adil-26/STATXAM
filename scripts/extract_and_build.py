import json
import os
import re

transcript_path = r'C:\Users\i.adil\.gemini\antigravity\brain\f6fa652d-e368-4838-9050-cc0cc4f991b9\.system_generated\logs\transcript_full.jsonl'
with open(transcript_path, 'r', encoding='utf-8') as f:
    data = json.loads(f.readline())
content = data['content']

indices = [m.start() for m in re.finditer(r'<!DOCTYPE html>', content, re.IGNORECASE)]
print(f"Found {len(indices)} documents at indices: {indices}")

# Clean raw docs
raw_docs = []
for i in range(len(indices)):
    start = indices[i]
    end = indices[i+1] if i+1 < len(indices) else len(content)
    raw = content[start:end]
    clean = re.sub(r'\n*<!--\s*[A-Za-z0-9\s\-&]+?\s*-->\s*$', '', raw).strip()
    raw_docs.append(clean)

def update_common_header_and_nav(html):
    # Update navigation hrefs
    html = html.replace('data-path="home" href="#"', 'data-path="home" href="home.html"')
    html = html.replace('data-path="practice" href="#"', 'data-path="practice" href="practice.html"')
    html = html.replace('data-path="ai-tutor" href="#"', 'data-path="ai-tutor" href="ai-tutor.html"')
    html = html.replace('data-path="progress" href="#"', 'data-path="progress" href="progress.html"')
    html = html.replace('data-path="profile" href="#"', 'data-path="profile" href="profile.html"')
    
    # Update header profile avatar
    avatar_old = '<div class="h-9 w-9 rounded-full p-0.5 bg-surface-container-highest flex items-center justify-center"><img alt="Profile"'
    avatar_new = '<a href="profile.html" aria-label="Open Profile" class="h-9 w-9 rounded-full p-0.5 bg-surface-container-highest flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary-container transition-all"><img alt="Profile"'
    if avatar_old in html:
        html = html.replace(avatar_old, avatar_new)
        # also replace the matching closing </div> after img
        # notice: <img alt="Profile" ... /></div></div></div></header>
        html = html.replace('alt="Profile" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYz7LNgDpP0_-v2fINlidy4Fj2w1pfCFUhFkd7H-89srni8b-3Wy4TDInR6TNuOn4W2Ucy1NYd9TXciooYatxltgyB40xCEyNbmxi58GG8S0vaPR7_DE_qNInL71Hb2-LwiO6cn5TorclWYzQOxb7dw-hzvfnjHjkUxer6LGSxENP6Lwe68PCeDq1_dORFT4fOMdT8RzkWk1T-4yLthvB3bSoroSolatHZd7gCXmpq"/></div></div></div></header>',
                            'alt="Profile" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYz7LNgDpP0_-v2fINlidy4Fj2w1pfCFUhFkd7H-89srni8b-3Wy4TDInR6TNuOn4W2Ucy1NYd9TXciooYatxltgyB40xCEyNbmxi58GG8S0vaPR7_DE_qNInL71Hb2-LwiO6cn5TorclWYzQOxb7dw-hzvfnjHjkUxer6LGSxENP6Lwe68PCeDq1_dORFT4fOMdT8RzkWk1T-4yLthvB3bSoroSolatHZd7gCXmpq"/></a></div></div></header>')

    # Update header logo
    logo_pattern = r'<div class="flex items-center gap-space-sm min-w-0 flex-shrink"><img alt="StatXam Logo"'
    logo_replace = r'<a href="home.html" aria-label="Go to Home" class="flex items-center gap-space-sm min-w-0 flex-shrink cursor-pointer hover:opacity-90 transition-opacity"><img alt="StatXam Logo"'
    if '<div class="flex items-center gap-space-sm min-w-0 flex-shrink"><img alt="StatXam Logo"' in html:
        html = html.replace('<div class="flex items-center gap-space-sm min-w-0 flex-shrink"><img alt="StatXam Logo"', logo_replace)
        html = html.replace('truncate uppercase">ONLINE - REMOTE API</span></div></div></div><div class="flex items-center',
                            'truncate uppercase">ONLINE - REMOTE API</span></div></div></a><div class="flex items-center')

    return html

# 1. PRACTICE
practice_html = update_common_header_and_nav(raw_docs[0])

# 2. PROGRESS
progress_html = update_common_header_and_nav(raw_docs[1])
# Connect Fix Gap button
progress_html = progress_html.replace(
    '<span>Fix Gap (+15 Qs)</span>',
    '<span>Fix Gap (+15 Qs)</span>'
).replace(
    '<button class="px-2.5 py-1 rounded bg-error-container text-on-error font-label-sm text-label-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform">',
    '<button onclick="window.location.href=\'practice.html\'" class="px-2.5 py-1 rounded bg-error-container text-on-error font-label-sm text-label-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform">'
)

# 3. HOME
home_html = update_common_header_and_nav(raw_docs[2])
# Connect Snap Question CTA to ai-tutor.html or open camera
home_html = home_html.replace(
    'id="snapQuestionBtn">',
    'id="snapQuestionBtn" onclick="window.location.href=\'ai-tutor.html?action=camera\'">'
)
# Connect target domain modules
home_html = home_html.replace(
    '<a class="font-label-sm text-label-sm text-primary-container hover:underline uppercase tracking-wide" href="#">All (14)</a>',
    '<a class="font-label-sm text-label-sm text-primary-container hover:underline uppercase tracking-wide" href="practice.html">All (14)</a>'
)

# 4. AI TUTOR
ai_tutor_html = update_common_header_and_nav(raw_docs[3])

# 5. PROFILE
profile_html = update_common_header_and_nav(raw_docs[4])
# Connect Sign Out button
profile_html = profile_html.replace(
    '<button class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-error hover:bg-error/10 transition-colors active:scale-[0.99]">',
    '<button onclick="window.location.href=\'sign-in.html\'" class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-error hover:bg-error/10 transition-colors active:scale-[0.99]">'
)

# 6. SIGN IN
sign_in_html = raw_docs[5]
# Connect Go Back button
sign_in_html = sign_in_html.replace('onclick="history.back()"', 'onclick="window.location.href=\'home.html\'"')
# Connect Create Pilot ID
sign_in_html = sign_in_html.replace('href="#signup"', 'href="sign-up.html"')
# Update simulateAuth & triggerBiometrics to redirect to home.html
sign_in_html = sign_in_html.replace(
    "btn.innerHTML = `<span class=\"material-symbols-outlined text-[20px] text-tertiary-fixed\">check_circle</span><span>Session Authorized</span>`;\n      btn.classList.add('bg-tertiary-container', 'text-on-tertiary-container');\n    }, 1200);",
    "btn.innerHTML = `<span class=\"material-symbols-outlined text-[20px] text-tertiary-fixed\">check_circle</span><span>Session Authorized</span>`;\n      btn.classList.add('bg-tertiary-container', 'text-on-tertiary-container');\n      setTimeout(() => { window.location.href = 'home.html'; }, 700);\n    }, 1200);"
)
sign_in_html = sign_in_html.replace(
    "scanBadge.textContent = 'Matched';\n      scanBadge.classList.add('text-tertiary-fixed');\n    }, 900);",
    "scanBadge.textContent = 'Matched';\n      scanBadge.classList.add('text-tertiary-fixed');\n      setTimeout(() => { window.location.href = 'home.html'; }, 600);\n    }, 900);"
)

# 7. SIGN UP (Fix truncated script)
raw_doc7 = raw_docs[6]
trunc_marker = raw_doc7.find('<truncated')
if trunc_marker != -1:
    base_doc7 = raw_doc7[:trunc_marker]
else:
    base_doc7 = raw_doc7

# Cut at matchIcon.text
cutoff = base_doc7.find('matchIcon.text')
if cutoff != -1:
    valid_base = base_doc7[:cutoff]
else:
    valid_base = base_doc7

sign_up_tail = """matchIcon.textContent = 'task_alt';
          matchIcon.className = 'material-symbols-outlined text-tertiary-fixed text-[18px]';
        } else {
          matchIcon.textContent = 'cancel';
          matchIcon.className = 'material-symbols-outlined text-error text-[18px]';
        }
      }
    }

    function applyRuleState(el, isValid, text) {
      if (!el) return;
      const icon = el.querySelector('.material-symbols-outlined');
      if (isValid) {
        el.className = 'flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-container text-tertiary-fixed';
        if (icon) icon.textContent = 'check';
      } else {
        el.className = 'flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-container text-outline';
        if (icon) icon.textContent = 'close';
      }
    }

    masterPwd?.addEventListener('input', updatePasswordValidation);
    confirmPwd?.addEventListener('input', updatePasswordValidation);

    // Toggle password visibility
    const togglePwdBtn = document.getElementById('toggle-pwd-btn');
    const togglePwdIcon = document.getElementById('toggle-pwd-icon');
    const togglePwdLabel = document.getElementById('toggle-pwd-label');

    togglePwdBtn?.addEventListener('click', () => {
      const isPassword = masterPwd.type === 'password';
      masterPwd.type = isPassword ? 'text' : 'password';
      confirmPwd.type = isPassword ? 'text' : 'password';
      if (togglePwdIcon) togglePwdIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
      if (togglePwdLabel) togglePwdLabel.textContent = isPassword ? 'HIDE' : 'SHOW';
    });

    // Terms switch toggle
    const cyberSwitch = document.getElementById('cyber-switch');
    const switchThumb = document.getElementById('switch-thumb');
    const switchContainer = document.getElementById('switch-container');
    let termsAccepted = true;

    function toggleTerms() {
      termsAccepted = !termsAccepted;
      if (termsAccepted) {
        cyberSwitch.setAttribute('aria-checked', 'true');
        cyberSwitch.className = 'relative w-12 h-6 rounded-full bg-primary-container p-0.5 transition-colors focus:outline-none flex-shrink-0';
        switchThumb.className = 'block w-5 h-5 rounded-full bg-on-primary-container shadow-md transform translate-x-6 transition-transform';
      } else {
        cyberSwitch.setAttribute('aria-checked', 'false');
        cyberSwitch.className = 'relative w-12 h-6 rounded-full bg-surface-container-highest p-0.5 transition-colors focus:outline-none flex-shrink-0';
        switchThumb.className = 'block w-5 h-5 rounded-full bg-outline shadow-md transform translate-x-0 transition-transform';
      }
    }

    switchContainer?.addEventListener('click', toggleTerms);
    cyberSwitch?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTerms();
    });

    // Submit pilot registration
    const submitBtn = document.getElementById('submit-pilot-btn');
    submitBtn?.addEventListener('click', () => {
      if (!termsAccepted) {
        alert('Please accept the Cadet Pilot Directive to proceed.');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span><span>Initializing Pilot Profile...</span>';
      
      setTimeout(() => {
        submitBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] text-tertiary-fixed">check_circle</span><span>Profile Ready! Entering Cockpit...</span>';
        submitBtn.className = 'w-full py-4 rounded-xl bg-tertiary-container text-on-tertiary-container font-headline-md text-headline-md tracking-wide font-bold uppercase flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(101,242,181,0.4)] active:scale-[0.98] transition-all';
        setTimeout(() => {
          window.location.href = 'home.html';
        }, 1000);
      }, 1300);
    });

    updatePasswordValidation();
  })();
</script></main></body></html>"""

sign_up_html = valid_base + sign_up_tail
# Connect Back button and footer button
sign_up_html = sign_up_html.replace('onclick="history.back()"', 'onclick="window.location.href=\'sign-in.html\'"')
sign_up_html = sign_up_html.replace("onclick=\"alert('Redirecting to Terminal Auth Node...')\"", "onclick=\"window.location.href='sign-in.html'\"")

# Save all files
files = {
    'practice.html': practice_html,
    'progress.html': progress_html,
    'home.html': home_html,
    'ai-tutor.html': ai_tutor_html,
    'profile.html': profile_html,
    'sign-in.html': sign_in_html,
    'sign-up.html': sign_up_html,
    'index.html': home_html  # default entry
}

for name, html_content in files.items():
    with open(name, 'w', encoding='utf-8') as out:
        out.write(html_content)
    print(f"Wrote {name} ({len(html_content)} bytes)")

print("All screens generated successfully!")
