interface ToastProps { message: string, onCloseToast: (id: string) => void }

const Toast = (props: ToastProps) => <dialog style={{ color: 'red', border: '1px solid red' }} open key={props.message}>{props.message}</dialog>;

export default Toast;
