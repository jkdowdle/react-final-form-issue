import React from 'react'
// import { useField } from 'react-final-form'

// import { useField } from './modified-use-field'

export const MyField = ({ selection, useField }) => {
  const { input } = useField(selection.id)

  return (
    <div>
      <label htmlFor={input.name}>Comment</label>
      <textarea {...input} id={input.name} />
    </div>
  )
}

export default MyField
