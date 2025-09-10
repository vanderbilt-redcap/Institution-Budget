$(document).ready(function() {
    $('body').on('focus', 'input[name^="cpt"]', function () {
        let row = $(this).closest('tr');
        let cptField = $(this);
        let procField = row.find('input[name^="procedure"]');
        let costField = row.find('input[name^="cost"]');
        let fillcptFields = function(item) {
            if (item.cpt) {
                cptField.val(item.cpt);
            } else {
                cptField.val('');
            }
            procField.val(item.description);
            costField.val(item.totalFees);
        }
        let price_autocomplete = $(this).autocomplete({
            minLength: 2,
            delay: 300,
            source: function(request, response) {
                $.getJSON(ajax_url, { term: request.term }, function (data) {
                    response($.map(data,
                        function(item) {
                            let returnObj = item;
                            let label = '';

                            if (item.cpt) {
                                label = '('+item.cpt+') ';
                            }
                            label += item.description + ' - $' + item.totalFees;
                            returnObj.label = label;
                            return returnObj;
                        }));
                });
            },
            select: function( event, ui ) {
                fillcptFields(ui.item);
                event.preventDefault();
            },
            focus: function( event, ui ) {
                event.preventDefault();
            }
        });
    });

});
