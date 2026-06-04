import 'server-only'
import bcrypt from 'bcryptjs'

export interface DemoUser {
  id: number
  username: string
  email: string
  role: 'admin' | 'employee' | 'executive'
  department: string | null
  full_name: string | null
  company: string | null
  passwordHash: string
}

const rawDemoUsers: Array<{
  id: number
  username: string
  password: string
  email: string
  role: 'admin' | 'employee' | 'executive'
  department: string | null
  full_name: string | null
  company: string | null
}> = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    email: 'admin@vexartech.com',
    role: 'admin',
    department: 'Management',
    full_name: null,
    company: null,
  },
  {
    id: 2,
    username: 'john.smith',
    password: 'emp123',
    email: 'john.smith@vexartech.com',
    role: 'employee',
    department: 'IT Support',
    full_name: 'John Smith',
    company: null,
  },
  {
    id: 3,
    username: 'sarah.johnson',
    password: 'emp123',
    email: 'sarah.johnson@vexartech.com',
    role: 'employee',
    department: 'Human Resources',
    full_name: 'Sarah Johnson',
    company: null,
  },
  {
    id: 4,
    username: 'executive',
    password: 'exec123',
    email: 'executive@vexartech.com',
    role: 'executive',
    department: 'Leadership',
    full_name: null,
    company: null,
  },
]

export const demoUsers: DemoUser[] = rawDemoUsers.map((user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  department: user.department,
  full_name: user.full_name,
  company: user.company,
  passwordHash: bcrypt.hashSync(user.password, 10),
}))
