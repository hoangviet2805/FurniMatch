const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.tsx', 'utf-8');
const target = `const submit=async(e:React.FormEvent)=>{e.preventDefault();try{const r=await api.post('/orders',{items,recipientName:f.recipient,phone:f.phone,address:f.address,note:f.note,shippingFee:shipping,paymentMethod:'SEPAY'});saveCart([]);setPay(r.data)}catch(e:any){setError(e.response?.data?.message??'Không thể tạo đơn hàng.')}};`;
const replace = `const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if (!/^0[35789]\\d{8}$/.test(f.phone)) {
        setError('Số điện thoại không hợp lệ. Vui lòng nhập 10 số và bắt đầu bằng các đầu số 03, 05, 07, 08, 09.');
        return;
    }
    setError('');
    try{
        const r=await api.post('/orders',{items,recipientName:f.recipient,phone:f.phone,address:f.address,note:f.note,shippingFee:shipping,paymentMethod:'SEPAY'});
        saveCart([]);
        setPay(r.data);
    }catch(e:any){
        setError(e.response?.data?.message??'Không thể tạo đơn hàng.');
    }
};`;

content = content.replace(target, replace);
fs.writeFileSync('src/pages/Checkout.tsx', content, 'utf-8');
console.log('Fixed checkout phone validation');
