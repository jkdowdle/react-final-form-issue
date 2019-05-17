// @flow
import React from 'react'
import { fieldSubscriptionItems } from 'final-form'
import { useForm } from 'react-final-form'
import type {
  FieldSubscription,
  FieldState,
  FormApi,
  Config,
  Decorator,
  FormState,
  FormSubscription,
  FieldValidator
} from 'final-form'

type SupportedInputs = 'input' | 'select' | 'textarea'

export type ReactContext = {
  reactFinalForm: FormApi
}

export type FieldInputProps = {
  name: string,
  onBlur: (?SyntheticFocusEvent<*>) => void,
  onChange: (SyntheticInputEvent<*> | any) => void,
  onFocus: (?SyntheticFocusEvent<*>) => void,
  value: any,
  type?: string,
  checked?: boolean,
  multiple?: boolean
}
export type FieldRenderProps = {
  input: FieldInputProps,
  meta: {
    // TODO: Make a diff of `FieldState` without all the functions
    active?: boolean,
    data?: Object,
    dirty?: boolean,
    dirtySinceLastSubmit?: boolean,
    error?: any,
    initial?: boolean,
    invalid?: boolean,
    meta?: boolean,
    pristine?: boolean,
    submitError?: any,
    submitFailed?: boolean,
    submitSucceeded?: boolean,
    submitting?: boolean,
    touched?: boolean,
    valid?: boolean,
    visited?: boolean
  }
}

export type FormRenderProps = {
  handleSubmit: (?SyntheticEvent<HTMLFormElement>) => ?Promise<?Object>,
  form: FormApi
} & FormState

export type FormSpyRenderProps = {
  form: FormApi
} & FormState

export type RenderableProps<T> = {
  component?: React.ComponentType<*> | SupportedInputs,
  children?: ((props: T) => React.Node) | React.Node,
  render?: (props: T) => React.Node
}

export type FormProps = {
  subscription?: FormSubscription,
  decorators?: Decorator[],
  initialValuesEqual?: (?Object, ?Object) => boolean
} & Config &
  RenderableProps<FormRenderProps>

export type UseFieldConfig = {
  allowNull?: boolean,
  component?: SupportedInputs,
  defaultValue?: any,
  format?: (value: any, name: string) => any,
  formatOnBlur?: boolean,
  initialValue?: any,
  isEqual?: (a: any, b: any) => boolean,
  multiple?: boolean,
  parse?: (value: any, name: string) => any,
  subscription?: FieldSubscription,
  type?: string,
  validate?: FieldValidator,
  validateFields?: string[],
  value?: any
}

export type FieldProps = UseFieldConfig & {
  name: string
} & RenderableProps<FieldRenderProps> & {
    component?: React.ComponentType<*> | SupportedInputs
  }

export type UseFormStateParams = {
  onChange?: (formState: FormState) => void,
  subscription?: FormSubscription
}

export type FormSpyProps = UseFormStateParams &
  RenderableProps<FormSpyRenderProps>

export type FormSpyPropsWithForm = {
  reactFinalForm: FormApi
} & FormSpyProps

type Subscription = { [string]: boolean }
function flattenSubscription(subscription: Subscription = {}): string[] {
  return Object.keys(subscription).filter(key => subscription[key] === true)
}

const getSelectedValues = options => {
  const result = []
  if (options) {
    for (let index = 0; index < options.length; index++) {
      const option = options[index]
      if (option.selected) {
        result.push(option.value)
      }
    }
  }
  return result
}

const getValue = (
  event: SyntheticInputEvent<*>,
  currentValue: any,
  valueProp: any,
  isReactNative: boolean
) => {
  if (
    !isReactNative &&
    event.nativeEvent &&
    (event.nativeEvent: Object).text !== undefined
  ) {
    return (event.nativeEvent: Object).text
  }
  if (isReactNative && event.nativeEvent) {
    return (event.nativeEvent: any).text
  }
  const detypedEvent: any = event
  const {
    target: { type, value, checked }
  } = detypedEvent
  switch (type) {
    case 'checkbox':
      if (valueProp !== undefined) {
        // we are maintaining an array, not just a boolean
        if (checked) {
          // add value to current array value
          return Array.isArray(currentValue)
            ? currentValue.concat(valueProp)
            : [valueProp]
        } else {
          // remove value from current array value
          if (!Array.isArray(currentValue)) {
            return currentValue
          }
          const index = currentValue.indexOf(valueProp)
          if (index < 0) {
            return currentValue
          } else {
            return currentValue
              .slice(0, index)
              .concat(currentValue.slice(index + 1))
          }
        }
      } else {
        // it's just a boolean
        return !!checked
      }
    case 'select-multiple':
      return getSelectedValues((event.target: any).options)
    default:
      return value
  }
}

const isReactNative =
  typeof window !== 'undefined' &&
  window.navigator &&
  window.navigator.product &&
  window.navigator.product === 'ReactNative'

const all: FieldSubscription = fieldSubscriptionItems.reduce((result, key) => {
  result[key] = true
  return result
}, {})

const defaultFormat = (value: ?any, name: string) =>
  value === undefined ? '' : value
const defaultParse = (value: ?any, name: string) =>
  value === '' ? undefined : value

export const useField = (
  name: string,
  {
    allowNull,
    component,
    defaultValue,
    format = defaultFormat,
    formatOnBlur,
    initialValue,
    isEqual,
    multiple,
    parse = defaultParse,
    subscription,
    type,
    validate,
    validateFields,
    value: _value
  }: UseFieldConfig = {}
): FieldRenderProps => {
  const form: FormApi = useForm('useField')

  // keep ref to most recent copy of validate function
  const validateRef = React.useRef(validate)
  React.useEffect(() => {
    validateRef.current = validate
  })

  const register = (callback: FieldState => void) =>
    form.registerField(name, callback, subscription || all, {
      defaultValue,
      getValidator: () => validateRef.current,
      initialValue,
      isEqual,
      validateFields
    })

  const firstRender = React.useRef(true)

  // synchronously register and unregister to query field state for our subscription on first render
  const [state, setState] = React.useState<FieldState>(
    (): FieldState => {
      let initialState: FieldState = {}
      register(state => {
        initialState = state
      })()
      return initialState
    }
  )

  // ⚠️ flattenedSubscription is probably not "hook-safe".
  // In the future, changing subscriptions on the fly should be banned. ⚠️
  const flattenedSubscription = flattenSubscription(subscription || all)
  React.useEffect(
    () =>
      register(state => {
        if (firstRender.current) {
          firstRender.current = false
        } else {
          setState(state)
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      name,
      defaultValue,
      // If we want to allow inline fat-arrow field-level validation functions, we
      // cannot reregister field every time validate function !==.
      // validate,
      initialValue,
      isEqual,
      validateFields,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ...flattenedSubscription
    ]
  )

  const handlers = {
    onBlur: React.useCallback(
      (event: ?SyntheticFocusEvent<*>) => {
        // this is to appease the Flow gods
        // istanbul ignore next
        if (state) {
          state.blur()
          if (format && formatOnBlur) {
            state.change(format(state.value, state.name))
          }
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [state.name, state.value, format, formatOnBlur]
    ),
    onChange: React.useCallback(
      (event: SyntheticInputEvent<*> | any) => {
        // istanbul ignore next
        if (process.env.NODE_ENV !== 'production' && event && event.target) {
          const targetType = event.target.type
          const unknown =
            ~['checkbox', 'radio', 'select-multiple'].indexOf(targetType) &&
            !type

          const value: any =
            targetType === 'select-multiple' ? state.value : _value

          if (unknown) {
            console.error(
              `Warning: You must pass \`type="${
                targetType === 'select-multiple' ? 'select' : targetType
              }"\` prop to your Field(${name}) component.\n` +
                `Without it we don't know how to unpack your \`value\` prop - ${
                  Array.isArray(value) ? `[${value}]` : `"${value}"`
                }.`
            )
          }
        }

        const value: any =
          event && event.target
            ? getValue(event, state.value, _value, isReactNative)
            : event
        state.change(parse ? parse(value, name) : value)
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [_value, name, parse, state, state.value, state.change, type]
    ),
    onFocus: React.useCallback((event: ?SyntheticFocusEvent<*>) => {
      state.focus()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  }

  let { blur, change, focus, value, name: ignoreName, ...otherState } = state
  const meta = {
    // this is to appease the Flow gods
    active: otherState.active,
    data: otherState.data,
    dirty: otherState.dirty,
    dirtySinceLastSubmit: otherState.dirtySinceLastSubmit,
    error: otherState.error,
    initial: otherState.initial,
    invalid: otherState.invalid,
    modified: otherState.modified,
    pristine: otherState.pristine,
    submitError: otherState.submitError,
    submitFailed: otherState.submitFailed,
    submitSucceeded: otherState.submitSucceeded,
    submitting: otherState.submitting,
    touched: otherState.touched,
    valid: otherState.valid,
    visited: otherState.visited
  }
  if (formatOnBlur) {
    value = defaultFormat(value, name)
  } else if (format) {
    value = format(value, name)
  }
  if (value === null && !allowNull) {
    value = ''
  }
  const input: FieldInputProps = { name, value, type, ...handlers }
  if (type === 'checkbox') {
    if (_value === undefined) {
      input.checked = !!value
    } else {
      input.checked = !!(Array.isArray(value) && ~value.indexOf(_value))
      input.value = _value
    }
  } else if (type === 'radio') {
    input.checked = value === _value
    input.value = _value
  } else if (component === 'select' && multiple) {
    input.value = input.value || []
    input.multiple = true
  }

  const renderProps: FieldRenderProps = { input, meta } // assign to force Flow check
  return renderProps
}
