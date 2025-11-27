document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.querySelector('.auth-modal');
    const registerLink = document.querySelector('.register-link');
    const loginLink = document.querySelector('.login-link');

    registerLink.addEventListener('click', e => {
        e.preventDefault();
        authModal.classList.add('slide');
    });

    loginLink.addEventListener('click', e => {
        e.preventDefault();
        authModal.classList.remove('slide');
    });
});
