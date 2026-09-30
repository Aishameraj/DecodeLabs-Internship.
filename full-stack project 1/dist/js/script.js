// open and close the mobile menu
const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');
document.documentElement.classList.add('js');
menuButton.hidden = false;

menuButton.addEventListener('click', function () {
  const isOpen = navLinks.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', isOpen);
  menuButton.textContent = isOpen ? 'Close ×' : 'Menu ☰';
});

function closeMenu() {
  navLinks.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = 'Menu ☰';
}

navLinks.querySelectorAll('a').forEach(function (link) {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && navLinks.classList.contains('open')) {
    closeMenu();
    menuButton.focus();
  }
});

// check the practice form without sending any data
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');

contactForm.addEventListener('input', function () {
  formStatus.textContent = '';
});

contactForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const nameInput = document.querySelector('#name');
  const messageInput = document.querySelector('#message');

  if (!nameInput.value.trim() || messageInput.value.trim().length < 10) {
    formStatus.textContent = 'Please add your name and a message with at least 10 non-space characters.';
    if (!nameInput.value.trim()) nameInput.focus();
    else messageInput.focus();
    return;
  }

  formStatus.textContent = 'Your message looks good! This is a practice form, so nothing has been sent or saved.';
});
