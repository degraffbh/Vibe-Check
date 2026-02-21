export function registerUser(email, password) {
    // This is a demo function. In a real application, you would send the email and password to a server to create an account.
    console.log(`Registering user with email: ${email} and password: ${password}`);

    const users = JSON.parse(localStorage.getItem("users") || "[]");

    users.push({email, password});
    localStorage.setItem("users", JSON.stringify(users));
}

export function loginUser(email, password) {
    // This is a demo function. In a real application, you would send the email and password to a server to log in.
    console.log(`Logging in user with email: ${email} and password: ${password}`);

    const users = JSON.parse(localStorage.getItem("users") || "[]");

    return users.find(user => user.email === email && user.password === password);
}