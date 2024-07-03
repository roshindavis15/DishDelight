import { check } from 'express-validator';

export const signUpValidation = [
    check('username', 'Username is required')
        .not().isEmpty(),
    check('email', 'Please include a valid email')
        .isEmail(),
    check('password', 'Password must be 6 or more characters')
        .isLength({ min: 6 })
];