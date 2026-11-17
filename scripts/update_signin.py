with open('sign-in.html', 'r', encoding='utf-8') as f:
    sign_in = f.read()

# Replace telegram-reset link to handle click
sign_in = sign_in.replace(
    'href="#telegram-reset"',
    'href="javascript:void(0)" onclick="triggerTelegramRecovery()"'
)

# Add toast and recovery function
tg_recovery_script = """
<!-- Toast Notice for Sign In -->
<div id="authNoticeToast" class="hidden fixed bottom-12 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-surface-container-highest text-primary-container font-label-md text-sm shadow-2xl z-50 flex items-center gap-2 pointer-events-none">
  <span class="material-symbols-outlined text-[18px]">verified</span>
  <span id="authNoticeMsg">OTP Dispatched</span>
</div>

<script>
  function triggerTelegramRecovery() {
    const toast = document.getElementById('authNoticeToast');
    const msg = document.getElementById('authNoticeMsg');
    const pwd = document.getElementById('passwordInput');
    
    if (toast && msg) {
      msg.textContent = 'OTP Token 782-914 sent to @StatXamAuthBot! Auto-filling...';
      toast.classList.remove('hidden');
      setTimeout(() => {
        if (pwd) {
          pwd.value = 'TG-OTP#782914';
          checkPasswordEntropy('TG-OTP#782914');
        }
      }, 700);
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3500);
    }
  }
</script>
"""

sign_in = sign_in.replace('</body>', tg_recovery_script + '</body>')

with open('sign-in.html', 'w', encoding='utf-8') as f:
    f.write(sign_in)

print("Updated sign-in.html with Telegram OTP recovery simulation!")
