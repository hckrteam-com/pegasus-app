<script>
    //document.getElementById('submit').addEventListener('submit', startrpc)



  document.getElementById("submit").addEventListener("click", function () {
    console.log("chujjj")
      startrpc()
    });

  async function startrpc() {
      //event.preventDefault();
      const place_id = document.getElementById('place_id').value;

  const result = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
  headers: {
    'Content-Type': 'application/json'
        },
  body: JSON.stringify({
    place_id
  })
      }).then((res) => res.json())
  console.log(result)
  if (result.success == true) {

  } else {
    alert(result.error)
  }
    }


</script>