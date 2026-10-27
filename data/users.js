import bcrypt from 'bcrypt';

const users = [
  {
    name: 'Admin User',
    email: 'admin@aurelia.com',
    password: 'password123', // Raw password, hashed in seeder
    role: 'admin',
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user',
  },
  {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    role: 'user',
  },
];

export default users;
