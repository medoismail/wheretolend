import React from 'react'

export const Select = ({ children, ...props }) => {
  return <select {...props}>{children}</select>
}

export const SelectContent = ({ children }) => {
  return <>{children}</>
}

export const SelectItem = ({ children, ...props }) => {
  return <option {...props}>{children}</option>
}

export const SelectTrigger = ({ children }) => {
  return <>{children}</>
}

export const SelectValue = ({ children }) => {
  return <>{children}</>
}