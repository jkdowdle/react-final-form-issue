import 'react-testing-library/cleanup-after-each'
import 'jest-dom/extend-expect'

import React from 'react'
import { render, fireEvent, wait } from 'react-testing-library'
import { Form, useField } from 'react-final-form'
import MyField from '../MyField'
import { useField as useModifiedField } from '../modified-use-field'

describe('react final form, possible bug', () => {
  it('fails with useField', () => {
    const handleSubmit = jest.fn((values, form) => {
      const { modified } = form.getState()
      console.log('modified', modified)
    })
    const { debug, getByLabelText, getByText } = render(
      <App handleSubmit={handleSubmit} hook={useField} />
    )

    fireEvent.click(getByText('Edit two'))

    fireEvent.change(getByLabelText('Comment'), {
      target: { value: 'Bilbo Baggins' }
    })

    fireEvent.click(getByText('Submit'))

    expect(handleSubmit.mock.calls[0][0]).toEqual({
      one: '',
      two: 'Bilbo Baggins'
    })
  })

  it('passes with useModifiedField', () => {
    const handleSubmit = jest.fn((values, form) => {
      const { modified } = form.getState()
      console.log('modified', modified)
    })
    const { debug, getByLabelText, getByText } = render(
      <App handleSubmit={handleSubmit} hook={useModifiedField} />
    )

    fireEvent.click(getByText('Edit two'))

    fireEvent.change(getByLabelText('Comment'), {
      target: { value: 'Bilbo Baggins' }
    })

    fireEvent.click(getByText('Submit'))

    expect(handleSubmit.mock.calls[0][0]).toEqual({
      one: '',
      two: 'Bilbo Baggins'
    })
  })
})

const AppContext = React.createContext()
const AppContextSet = React.createContext()

const App = ({ handleSubmit, hook }) => {
  return (
    <AppProvider>
      <Main />
      <MyWeirdForm handleSubmit={handleSubmit} useField={hook} />
    </AppProvider>
  )
}

const useSelection = () => {
  return React.useContext(AppContext)
}

const useSetSelection = () => {
  return React.useContext(AppContextSet)
}

const AppProvider = ({ children }) => {
  const [selection, setSelection] = React.useState(null)
  return (
    <AppContext.Provider value={selection}>
      <AppContextSet.Provider value={setSelection}>
        {children}
      </AppContextSet.Provider>
    </AppContext.Provider>
  )
}

const Main = () => {
  const setSelection = useSetSelection()

  React.useEffect(() => {
    setSelection({ id: 'one' })
  })

  return (
    <div>
      <div onClick={() => setSelection({ id: 'one' })}>Edit one</div>
      <div onClick={() => setSelection({ id: 'two' })}>Edit two</div>
    </div>
  )
}

const MyWeirdForm = ({ handleSubmit = () => {}, useField }) => {
  const selection = useSelection()
  return (
    <div>
      <Form initialValues={{ one: '', two: '' }} onSubmit={handleSubmit}>
        {({ handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            {selection && (
              <>
                <MyField selection={selection} useField={useField} />
                <div>
                  <button type="submit">Submit</button>
                </div>
              </>
            )}
          </form>
        )}
      </Form>
    </div>
  )
}
